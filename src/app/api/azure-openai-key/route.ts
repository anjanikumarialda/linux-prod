'use server';

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the key from environment variables
    const key = process.env.AZURE_OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: 'Azure OpenAI API key not configured in environment variables (AZURE_OPENAI_API_KEY)' },
        { status: 500 }
      );
    }

    // Return the key
    return NextResponse.json({
      apiKey: key
    });
  } catch (error) {
    console.error('Error fetching Azure OpenAI key:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key' },
      { status: 500 }
    );
  }
} 