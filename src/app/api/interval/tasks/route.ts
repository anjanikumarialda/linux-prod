import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { apiKey } = await request.json();
        
        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key is required' },
                { status: 400 }
            );
        }

        const token = Buffer.from(`${apiKey}:`).toString('base64');
        console.log('Fetching tasks from Intervals API...');
        
        const response = await fetch('https://api.myintervals.com/task/', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to fetch tasks:', errorData);
            return NextResponse.json(
                { error: errorData.message || 'Failed to fetch tasks' },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('Raw tasks response:', data);
        console.log('Number of tasks:', data.task ? data.task.length : 0);
        
        // Add sample task logging
        if (data.task && data.task.length > 0) {
            console.log('Sample task:', data.task[0]);
        }

        return NextResponse.json({ tasks: data.task || [] });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tasks' },
            { status: 500 }
        );
    }
} 