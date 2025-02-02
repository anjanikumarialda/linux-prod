import { NextResponse } from 'next/server';
import { TimeEntry } from '@/lib/types';
import { fetchTeamsMeetings } from '@/lib/teams-api';

async function fetchLatestTimeEntry(apiKey: string): Promise<TimeEntry | null> {
  try {
    // Get today's date
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

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
    const timeEntries: TimeEntry[] = data.time || [];

    // Sort by date descending and return the most recent entry
    return timeEntries.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0] || null;
  } catch (error) {
    console.error('Error fetching latest time entry:', error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const intervalsKey = searchParams.get('intervalsKey');

    if (!userEmail || !intervalsKey) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get the latest time entry
    const latestTimeEntry = await fetchLatestTimeEntry(intervalsKey);

    if (!latestTimeEntry) {
      return NextResponse.json(null);
    }

    // Fetch meetings for the date of the latest time entry
    const startDateTime = `${latestTimeEntry.date}T00:00:00Z`;
    const endDateTime = `${latestTimeEntry.date}T23:59:59Z`;

    const meetings = await fetchTeamsMeetings(userEmail, startDateTime, endDateTime);

    // Find the meeting that matches the time entry
    const lastPostedMeeting = meetings.find(meeting => 
      meeting.subject === latestTimeEntry.description ||
      latestTimeEntry.notes?.includes(meeting.subject)
    );

    return NextResponse.json(lastPostedMeeting || null);
  } catch (error) {
    console.error('Error fetching latest meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest meeting' },
      { status: 500 }
    );
  }
} 