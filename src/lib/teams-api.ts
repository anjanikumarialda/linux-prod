'use server';

import axios from 'axios';
import type { Meeting } from './types';
import { convertToIST } from './utils';

const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';

interface AttendanceRecord {
  identity?: {
    displayName: string;
  };
  emailAddress: string;
  role: string;
  totalAttendanceInSeconds: number;
  joinTime: string;
  leaveTime: string;
}

interface ProcessedMeeting {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  organizer: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  onlineMeeting?: {
    joinUrl: string;
  };
  scheduledDuration: string;
  actualAttendance: string;
  status: string;
  platform: string;
}

interface GraphMeeting {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  organizer: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  onlineMeeting?: {
    joinUrl: string;
  };
}

async function getApplicationAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_AD_APP_TENANT_ID;
  const clientId = process.env.AZURE_AD_APP_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_APP_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing required environment variables for Teams API authentication');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default'
  });

  try {
    const response = await axios.post(tokenUrl, params);
    return response.data.access_token;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);

  return parts.join(' ');
}

function getScheduledDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationInSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
  return formatDuration(durationInSeconds);
}

async function getAttendanceRecords(
  accessToken: string, 
  userId: string, 
  meeting: GraphMeeting,
  userEmail: string
): Promise<{ userAttendance: AttendanceRecord | null; allRecords: AttendanceRecord[] }> {
  try {
    if (!meeting.onlineMeeting?.joinUrl) {
      console.log('Not a Teams meeting or no join URL available');
      return { userAttendance: null, allRecords: [] };
    }

    const decodedJoinUrl = decodeURIComponent(meeting.onlineMeeting.joinUrl);
    let meetingId, organizerOid;

    // Extract the meeting thread ID
    const meetingMatch = decodedJoinUrl.match(/19:meeting_([^@]+)@thread\.v2/);
    if (meetingMatch) {
      meetingId = `19:meeting_${meetingMatch[1]}@thread.v2`;
    }

    // Extract the organizer's Object ID
    const organizerMatch = decodedJoinUrl.match(/"Oid":"([^"]+)"/);
    if (organizerMatch) {
      organizerOid = organizerMatch[1];
    }

    if (!meetingId || !organizerOid) {
      console.log('Could not extract meeting ID or organizer ID from join URL');
      return { userAttendance: null, allRecords: [] };
    }

    // Format the meeting ID as required by the API
    const formattedString = `1*${organizerOid}*0**${meetingId}`;
    const base64MeetingId = Buffer.from(formattedString).toString('base64');

    console.log('Fetching attendance reports for meeting:', base64MeetingId);

    // Get attendance reports using the base64 encoded meeting ID
    const attendanceUrl = `${GRAPH_API_ENDPOINT}/users/${userId}/onlineMeetings/${base64MeetingId}/attendanceReports`;
    const reportsResponse = await axios.get(attendanceUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!reportsResponse.data.value?.length) {
      console.log('No attendance reports found for meeting');
      return { userAttendance: null, allRecords: [] };
    }

    // Get the attendance records from the first report
    const reportId = reportsResponse.data.value[0].id;
    const recordsUrl = `${GRAPH_API_ENDPOINT}/users/${userId}/onlineMeetings/${base64MeetingId}/attendanceReports/${reportId}/attendanceRecords`;
    
    console.log('Fetching attendance records:', recordsUrl);
    const recordsResponse = await axios.get(recordsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const allRecords = recordsResponse.data.value || [];
    console.log('All attendance records:', allRecords);

    // Find the current user's attendance record
    const userAttendance = allRecords.find(
      (record: AttendanceRecord) => record.emailAddress.toLowerCase() === userEmail.toLowerCase()
    ) || null;

    if (userAttendance) {
      console.log('Found user attendance:', {
        email: userAttendance.emailAddress,
        duration: userAttendance.totalAttendanceInSeconds,
        role: userAttendance.role
      });
    }

    return { userAttendance, allRecords };
  } catch (error) {
    console.error('Failed to fetch attendance records:', error);
    return { userAttendance: null, allRecords: [] };
  }
}

export async function fetchTeamsMeetings(
  userEmail: string,
  startDateTime: string,
  endDateTime: string
): Promise<ProcessedMeeting[]> {
  if (!userEmail) {
    throw new Error('User email is required');
  }

  try {
    console.log('🔍 Fetching meetings for:', { userEmail, startDateTime, endDateTime });
    
    const accessToken = await getApplicationAccessToken();
    const userResponse = await axios.get(
      `${GRAPH_API_ENDPOINT}/users/${encodeURIComponent(userEmail)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!userResponse.data.id) {
      throw new Error('User not found');
    }

    const userId = userResponse.data.id;
    const filter = encodeURIComponent(
      `start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'`
    );
    
    // Use calendar/events endpoint to get all meetings
    const meetingsUrl = `${GRAPH_API_ENDPOINT}/users/${userId}/calendar/events?$filter=${filter}`;
    console.log('📅 Fetching meetings from URL:', meetingsUrl);

    const response = await axios.get(meetingsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.data.value) {
      throw new Error('Invalid response format from Microsoft Graph API');
    }

    console.log('Found meetings:', response.data.value.length);
    const meetings = response.data.value;
    const processedMeetings = await Promise.all(
      meetings.map(async (meeting: any) => {
        try {
          console.log(`\n🎯 Processing meeting: ${meeting.subject}`);
          
          const { userAttendance, allRecords } = await getAttendanceRecords(
            accessToken, 
            userId, 
            meeting,
            userEmail
          );

          const scheduledDuration = getScheduledDuration(meeting.start.dateTime, meeting.end.dateTime);
          let actualAttendance = 'No Data';
          let status = 'No Data';

          if (userAttendance) {
            actualAttendance = formatDuration(userAttendance.totalAttendanceInSeconds);
            status = 'Attended';
            
            if (userAttendance.role.toLowerCase() === 'organizer') {
              actualAttendance = `${userAttendance.role} ${actualAttendance}`;
            }
          }

          // Convert UTC times to IST
          const istStart = {
            dateTime: convertToIST(meeting.start.dateTime).toISOString(),
            timeZone: 'Asia/Kolkata'
          };
          const istEnd = {
            dateTime: convertToIST(meeting.end.dateTime).toISOString(),
            timeZone: 'Asia/Kolkata'
          };

          return {
            id: meeting.id,
            subject: meeting.subject,
            start: istStart,
            end: istEnd,
            organizer: meeting.organizer,
            onlineMeeting: meeting.onlineMeeting,
            scheduledDuration,
            actualAttendance,
            status,
            platform: 'Teams'
          };
        } catch (error) {
          console.error(`Error processing meeting ${meeting.id}:`, error);
          // For error case, also convert times to IST
          const istStart = {
            dateTime: convertToIST(meeting.start.dateTime).toISOString(),
            timeZone: 'Asia/Kolkata'
          };
          const istEnd = {
            dateTime: convertToIST(meeting.end.dateTime).toISOString(),
            timeZone: 'Asia/Kolkata'
          };
          
          return {
            id: meeting.id,
            subject: meeting.subject,
            start: istStart,
            end: istEnd,
            organizer: meeting.organizer,
            onlineMeeting: meeting.onlineMeeting,
            scheduledDuration: getScheduledDuration(meeting.start.dateTime, meeting.end.dateTime),
            actualAttendance: 'No Data',
            status: 'No Data',
            platform: 'Teams'
          };
        }
      })
    );

    // Filter to only include meetings where the user is an attendee or organizer
    const filteredMeetings = processedMeetings.filter((meeting: ProcessedMeeting) => 
      meeting.organizer.emailAddress.address.toLowerCase() === userEmail.toLowerCase() ||
      meeting.status === 'Attended'
    );

    console.log('Final processed meetings:', JSON.stringify(filteredMeetings, null, 2));
    return filteredMeetings;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Failed to fetch meetings:', error.response?.data || error.message);
      throw new Error(`Failed to fetch meetings: ${error.response?.data?.error?.message || error.message}`);
    }
    throw error;
  }
} 