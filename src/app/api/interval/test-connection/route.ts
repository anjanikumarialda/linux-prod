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

        // Test connection to Intervals API
        const response = await fetch('https://api.myintervals.com/me', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Failed to connect to Intervals API';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                errorMessage += ` (${response.status}: ${response.statusText})`;
            }
            return NextResponse.json(
                { error: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error testing Intervals API connection:', error);
        return NextResponse.json(
            { error: 'Failed to test API connection' },
            { status: 500 }
        );
    }
} 