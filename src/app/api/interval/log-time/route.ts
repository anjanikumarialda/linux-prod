import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { apiKey, timeEntry } = await request.json();
        
        if (!apiKey || !timeEntry) {
            return NextResponse.json(
                { error: 'API key and time entry are required' },
                { status: 400 }
            );
        }

        // Get the person ID (current user)
        const meResponse = await fetch('https://api.myintervals.com/me/', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!meResponse.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch user information' },
                { status: meResponse.status }
            );
        }

        const meData = await meResponse.json();
        // The response has the user info in the 'me' array
        const personId = meData.me?.[0]?.id;

        if (!personId) {
            console.error('Me response data:', meData); // Log the response for debugging
            return NextResponse.json(
                { error: 'Could not determine user ID' },
                { status: 400 }
            );
        }

        // Create time entry in Intervals with hardcoded worktype ID
        const response = await fetch('https://api.myintervals.com/time/', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                date: timeEntry.date,
                time: timeEntry.duration,
                description: timeEntry.notes,
                billable: true,
                taskid: timeEntry.taskId,
                projectid: timeEntry.projectId,
                worktypeid: 800360, // Admin worktype
                personid: personId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response from Intervals API:', errorText);
            return NextResponse.json(
                { error: `Failed to log time entry: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error logging time entry:', error);
        return NextResponse.json(
            { error: 'Failed to log time entry' },
            { status: 500 }
        );
    }
} 