import { NextResponse } from 'next/server';
import { Meeting, TimeEntry } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const { apiKey, meetings } = await request.json();
        
        if (!apiKey || !meetings || !Array.isArray(meetings)) {
            return NextResponse.json(
                { error: 'API key and meetings array are required' },
                { status: 400 }
            );
        }

        const results: TimeEntry[] = [];
        const errors: { meetingId: string; error: string }[] = [];

        // Process each meeting
        for (const meeting of meetings) {
            try {
                // Calculate duration in hours
                const startTime = new Date(meeting.start.dateTime);
                const endTime = new Date(meeting.end.dateTime);
                const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours

                // Create time entry in Intervals
                const response = await fetch('https://api.myintervals.com/time/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        date: startTime.toISOString().split('T')[0],
                        time: duration,
                        description: `${meeting.subject} (Teams Meeting)`,
                        billable: true,
                        // Add any additional fields required by your Intervals setup
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText);
                }

                const timeEntry = await response.json();
                results.push(timeEntry);

            } catch (error) {
                console.error(`Failed to log meeting ${meeting.id}:`, error);
                errors.push({
                    meetingId: meeting.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        // Return results
        return NextResponse.json({
            success: true,
            timeEntries: results,
            errors: errors.length > 0 ? errors : undefined,
            message: errors.length > 0 
                ? `Logged ${results.length} meetings with ${errors.length} errors`
                : `Successfully logged ${results.length} meetings`
        });

    } catch (error) {
        console.error('Error logging meetings:', error);
        return NextResponse.json(
            { error: 'Failed to log meetings' },
            { status: 500 }
        );
    }
} 