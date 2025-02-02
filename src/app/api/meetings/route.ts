import { NextResponse } from 'next/server';
import { fetchTeamsMeetings } from '@/lib/teams-api';
import { compareMeetingsWithTimeEntries, getUnloggedMeetings } from '@/lib/comparison-utils';
import { TimeEntry } from '@/lib/types';

async function fetchTimeEntries(apiKey: string, startDate: string, endDate: string): Promise<TimeEntry[]> {
  console.log('Fetching time entries for date range:', { startDate, endDate });
  
  const response = await fetch('https://api.myintervals.com/time/', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error response from Intervals API:', errorText);
    throw new Error(`Failed to fetch time entries: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('Raw time entries response:', data);
  
  const allTimeEntries: TimeEntry[] = data.time || [];
  console.log('All time entries:', allTimeEntries);
  
  // Filter entries by date range
  const filteredEntries = allTimeEntries.filter(entry => 
    entry.date >= startDate && entry.date <= endDate
  );
  
  console.log('Filtered time entries:', filteredEntries);
  return filteredEntries;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const startDateTime = searchParams.get('startDateTime');
    const endDateTime = searchParams.get('endDateTime');
    const intervalsKey = searchParams.get('intervalsKey');

    console.log('\n🔍 API Request Details:', {
      userEmail,
      startDateTime,
      endDateTime
    });

    if (!userEmail || !startDateTime || !endDateTime || !intervalsKey) {
      const missingParams = [];
      if (!userEmail) missingParams.push('userEmail');
      if (!startDateTime) missingParams.push('startDateTime');
      if (!endDateTime) missingParams.push('endDateTime');
      if (!intervalsKey) missingParams.push('intervalsKey');

      return NextResponse.json(
        { error: `Missing required parameters: ${missingParams.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch meetings and time entries in parallel
    const [meetings, timeEntries] = await Promise.all([
      fetchTeamsMeetings(userEmail, startDateTime, endDateTime),
      fetchTimeEntries(
        intervalsKey,
        startDateTime.split('T')[0],
        endDateTime.split('T')[0]
      )
    ]);

    console.log('\nMeetings to check:', meetings.map(m => ({
      id: m.id,
      subject: m.subject,
      date: new Date(m.start.dateTime).toISOString().split('T')[0],
      duration: m.actualAttendance
    })));

    console.log('\nTime entries to compare:', timeEntries.map(t => ({
      id: t.id,
      description: t.description,
      date: t.date,
      time: t.time
    })));

    // Compare meetings with time entries to identify already logged ones
    const comparisonResults = await compareMeetingsWithTimeEntries(meetings, timeEntries);
    
    console.log('\nComparison results:', comparisonResults.map(r => ({
      meeting: r.meeting.subject,
      date: new Date(r.meeting.start.dateTime).toISOString().split('T')[0],
      isLogged: r.isLogged,
      matchedTimeEntry: r.timeEntry ? {
        description: r.timeEntry.description,
        date: r.timeEntry.date,
        time: r.timeEntry.time
      } : null
    })));
    
    // Get only unlogged meetings
    const unloggedMeetings = getUnloggedMeetings(comparisonResults);

    console.log(`\nFiltered to ${unloggedMeetings.length} unlogged meetings:`, 
      unloggedMeetings.map(m => ({
        subject: m.subject,
        date: new Date(m.start.dateTime).toISOString().split('T')[0]
      }))
    );

    return NextResponse.json(unloggedMeetings);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 