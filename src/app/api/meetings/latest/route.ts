import { NextResponse } from 'next/server';
import { TimeEntry } from '@/lib/types';
import { fetchTeamsMeetings } from '@/lib/teams-api';

interface RawTimeEntry {
  id?: string;
  date?: string;
  description?: string;
  notes?: string;
  time?: number;
  duration?: number;
  taskId?: string;
  projectid?: string;
  billable?: boolean;
  person?: string;
  [key: string]: any;
}

async function fetchLatestTimeEntry(apiKey: string): Promise<TimeEntry | null> {
  try {
    // Get today's date and 7 days ago for a wider search range
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    // First try to get all time entries
    const response = await fetch('https://api.myintervals.com/time/', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch time entries: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw time entries response:', data);
    
    if (!data.time || !Array.isArray(data.time)) {
      console.log('No time entries found in response');
      return null;
    }

    const timeEntries: RawTimeEntry[] = data.time;
    console.log('Number of time entries found:', timeEntries.length);

    // Get entries from the last 7 days and filter out any without dates
    const recentEntries = timeEntries
      .filter((entry: RawTimeEntry) => {
        if (!entry.date) {
          console.log('Entry missing date:', entry);
          return false;
        }
        const entryDate = new Date(entry.date);
        const isRecent = entryDate >= sevenDaysAgo && entryDate <= today;
        if (!isRecent) {
          console.log('Entry not in date range:', entry.date);
        }
        return isRecent;
      })
      .map((entry: RawTimeEntry): TimeEntry => ({
        id: entry.id,
        date: entry.date || new Date().toISOString().split('T')[0],
        time: typeof entry.time === 'number' ? entry.time.toString() : '0',
        duration: entry.duration || 0,
        description: entry.description || '',
        notes: entry.notes || '',
        billable: entry.billable || false,
        person: entry.person,
        taskId: entry.taskId || '',
        projectid: entry.projectid || ''
      }));

    console.log('Recent entries:', recentEntries);

    if (recentEntries.length === 0) {
      console.log('No recent entries found');
      return null;
    }

    // Sort by date and time descending
    const sortedEntries = recentEntries.sort((a: TimeEntry, b: TimeEntry) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      // If same date, try to compare by time if available
      const timeA = parseInt(a.time || '0', 10);
      const timeB = parseInt(b.time || '0', 10);
      return timeB - timeA;
    });

    console.log('Latest time entry:', sortedEntries[0]);
    return sortedEntries[0];
  } catch (error) {
    console.error('Error fetching latest time entry:', error);
    return null;
  }
}

function normalizeString(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findMatchingMeeting(meetings: any[], timeEntry: TimeEntry) {
  // Sort meetings by start time descending to get the most recent first
  const sortedMeetings = meetings.sort((a, b) => 
    new Date(b.start.dateTime).getTime() - new Date(a.start.dateTime).getTime()
  );

  // Try to find an exact match first
  let match = sortedMeetings.find(meeting => 
    meeting.subject === timeEntry.description ||
    (timeEntry.notes && timeEntry.notes.includes(meeting.subject))
  );

  // If no exact match, try fuzzy matching
  if (!match) {
    const normalizedDescription = normalizeString(timeEntry.description || '');
    match = sortedMeetings.find(meeting => {
      const normalizedSubject = normalizeString(meeting.subject || '');
      // More lenient matching - check if either contains parts of the other
      return normalizedDescription.includes(normalizedSubject) ||
             normalizedSubject.includes(normalizedDescription) ||
             // Also check if they share any significant words
             normalizedDescription.split(/\s+/).some(word => 
               word.length > 3 && normalizedSubject.includes(word)
             );
    });
  }

  // If still no match, just return the most recent meeting from the same day
  if (!match) {
    const timeEntryDate = new Date(timeEntry.date).toISOString().split('T')[0];
    match = sortedMeetings.find(meeting => {
      const meetingDate = new Date(meeting.start.dateTime).toISOString().split('T')[0];
      return meetingDate === timeEntryDate;
    });
  }

  return match;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const intervalsKey = searchParams.get('intervalsKey');

    if (!userEmail || !intervalsKey) {
      console.log('Missing parameters:', { userEmail: !!userEmail, intervalsKey: !!intervalsKey });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // First get all time entries from Intervals
    const response = await fetch('https://api.myintervals.com/time/', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(intervalsKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch time entries: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw time entries response:', data);
    
    if (!data.time || !Array.isArray(data.time)) {
      console.log('No time entries found in response');
      return NextResponse.json(null);
    }

    // Get all time entries from the last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const timeEntries = data.time
      .filter((entry: RawTimeEntry) => {
        if (!entry.date) return false;
        const entryDate = new Date(entry.date);
        return entryDate >= thirtyDaysAgo && entryDate <= today;
      })
      .sort((a: RawTimeEntry, b: RawTimeEntry) => {
        // Sort by date descending
        const dateA = new Date(a.date || '').getTime();
        const dateB = new Date(b.date || '').getTime();
        return dateB - dateA;
      });

    console.log('Found time entries:', timeEntries.length);

    if (timeEntries.length === 0) {
      console.log('No recent time entries found');
      return NextResponse.json(null);
    }

    // Get the latest time entry that looks like a meeting
    const latestMeetingEntry = timeEntries.find((entry: RawTimeEntry) => {
      const description = (entry.description || '').toLowerCase();
      // Look for keywords that indicate this is a meeting
      return description.includes('meeting') || 
             description.includes('call') || 
             description.includes('discussion') ||
             description.includes('sync') ||
             description.includes('standup') ||
             description.includes('review');
    });

    if (!latestMeetingEntry) {
      console.log('No meeting entries found');
      return NextResponse.json(null);
    }

    console.log('Latest meeting entry:', latestMeetingEntry);

    // Get meetings around this time entry's date
    const entryDate = new Date(latestMeetingEntry.date || '');
    const searchStartDate = new Date(entryDate);
    searchStartDate.setDate(entryDate.getDate() - 30); // Look 30 days before
    const searchEndDate = new Date(entryDate);
    searchEndDate.setDate(entryDate.getDate() + 30); // Look 30 days after

    const startDateTime = searchStartDate.toISOString().split('T')[0] + 'T00:00:00Z';
    const endDateTime = searchEndDate.toISOString().split('T')[0] + 'T23:59:59Z';

    console.log('Searching for meetings from', startDateTime, 'to', endDateTime, '(60-day window)');

    const meetings = await fetchTeamsMeetings(userEmail, startDateTime, endDateTime);
    console.log('Found meetings:', meetings.length);

    if (meetings.length === 0) {
      console.log('No meetings found in date range');
      return NextResponse.json(null);
    }

    // Find the meeting that matches this time entry
    const matchingMeeting = meetings.find(meeting => {
      const meetingDate = new Date(meeting.start.dateTime).toISOString().split('T')[0];
      const entryDateStr = latestMeetingEntry.date;
      
      // First check if the dates match
      if (meetingDate !== entryDateStr) return false;

      // Then check if the descriptions match
      const meetingSubject = meeting.subject.toLowerCase();
      const entryDescription = (latestMeetingEntry.description || '').toLowerCase();

      return meetingSubject === entryDescription ||
             entryDescription.includes(meetingSubject) ||
             meetingSubject.includes(entryDescription);
    });

    if (!matchingMeeting) {
      console.log('No matching meeting found for the time entry');
      return NextResponse.json(null);
    }

    // Add debug information
    const meetingWithDebug = {
      ...matchingMeeting,
      _debug: {
        timeEntryDate: latestMeetingEntry.date,
        timeEntryDescription: latestMeetingEntry.description,
        meetingDate: new Date(matchingMeeting.start.dateTime).toISOString(),
        isPosted: true
      }
    };

    return NextResponse.json(meetingWithDebug);
  } catch (error) {
    console.error('Error fetching latest meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest meeting' },
      { status: 500 }
    );
  }
} 