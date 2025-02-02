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

        // For now, we'll just return success since we're storing in localStorage
        return NextResponse.json(
            { message: 'API key saved successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error saving API key:', error);
        return NextResponse.json(
            { error: 'Failed to save API key' },
            { status: 500 }
        );
    }
} 