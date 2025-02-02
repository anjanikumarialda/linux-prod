import { NextResponse } from 'next/server';
import { TimeEntry } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const { apiKey, startDate, endDate } = await request.json();
        
        if (!apiKey || !startDate || !endDate) {
            const missingParams = [];
            if (!apiKey) missingParams.push('apiKey');
            if (!startDate) missingParams.push('startDate');
            if (!endDate) missingParams.push('endDate');
            
            return NextResponse.json(
                { 
                    error: `Missing required parameters: ${missingParams.join(', ')}`,
                    details: { missingParams }
                },
                { status: 400 }
            );
        }

        // Construct URL for time entries
        const url = new URL('https://api.myintervals.com/time');

        console.log('Fetching time entries from:', url.toString());
        console.log('Will filter for date range:', { startDate, endDate });

        // Fetch time entries from Intervals API
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            cache: 'no-store' // Disable cache
        });

        // Log response status and headers for debugging
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            
            let errorMessage = 'Failed to fetch time entries from Intervals API';
            let errorDetails = {};
            
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorData.error || errorMessage;
                errorDetails = errorData;
            } catch {
                errorMessage += ` (${response.status}: ${response.statusText})`;
                errorDetails = { rawError: errorText };
            }

            // Handle specific error cases
            switch (response.status) {
                case 401:
                    errorMessage = 'Invalid API key or unauthorized access';
                    break;
                case 403:
                    errorMessage = 'Forbidden: insufficient permissions';
                    break;
                case 404:
                    errorMessage = 'No time entries found';
                    break;
                case 429:
                    errorMessage = 'Too many requests. Please try again later';
                    break;
            }

            return NextResponse.json(
                { 
                    error: errorMessage,
                    details: {
                        status: response.status,
                        statusText: response.statusText,
                        ...errorDetails
                    }
                },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('Response data:', data);
        
        // Extract time entries and filter by date range
        const allTimeEntries: TimeEntry[] = data.time || [];
        const filteredTimeEntries = allTimeEntries.filter(entry => 
            entry.date >= startDate && entry.date <= endDate
        );
        
        console.log(`Filtered ${filteredTimeEntries.length} entries from ${allTimeEntries.length} total entries`);
        
        return NextResponse.json({ 
            time: filteredTimeEntries,
            count: filteredTimeEntries.length,
            total: allTimeEntries.length,
            dateRange: {
                start: startDate,
                end: endDate
            }
        });
    } catch (error) {
        console.error('Error fetching time entries:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Failed to fetch time entries',
                details: {
                    stack: error instanceof Error ? error.stack : undefined,
                    message: String(error)
                }
            },
            { status: 500 }
        );
    }
} 