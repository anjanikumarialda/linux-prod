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
        const response = await fetch('https://api.myintervals.com/project/', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to fetch projects:', errorData);
            return NextResponse.json(
                { error: errorData.message || 'Failed to fetch projects' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ projects: data.project || [] });
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
} 