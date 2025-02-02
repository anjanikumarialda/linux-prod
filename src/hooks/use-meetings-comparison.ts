'use client';

import { useState, useCallback } from 'react';
import { Meeting, ComparisonResult } from '@/lib/types';
import { ComparisonService } from '@/lib/comparison-service';
import { getIntervalsApiKey } from '@/lib/utils';

interface UseMeetingsComparisonProps {
    userEmail: string;
}

interface UseMeetingsComparisonState {
    isLoading: boolean;
    error: string | null;
    results: ComparisonResult[] | null;
}

export function useMeetingsComparison({ userEmail }: UseMeetingsComparisonProps) {
    const [state, setState] = useState<UseMeetingsComparisonState>({
        isLoading: false,
        error: null,
        results: null
    });

    const compareMeetings = useCallback(async (meetings: Meeting[]) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const apiKey = getIntervalsApiKey(userEmail);
            if (!apiKey) {
                throw new Error('Intervals API key not found. Please enter your API key first.');
            }

            const comparisonService = new ComparisonService(apiKey);
            const results = await comparisonService.compareMeetings(meetings);

            setState({
                isLoading: false,
                error: null,
                results
            });

            return {
                unloggedMeetings: comparisonService.getUnloggedMeetings(),
                loggedMeetings: comparisonService.getLoggedMeetings(),
                results
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred during comparison';
            setState({
                isLoading: false,
                error: errorMessage,
                results: null
            });
            throw error;
        }
    }, [userEmail]);

    const getTimeEntryForMeeting = useCallback((meetingId: string): ComparisonResult | undefined => {
        return state.results?.find(r => r.meeting.id === meetingId);
    }, [state.results]);

    const isMeetingLogged = useCallback((meetingId: string): boolean => {
        return state.results?.some(r => r.meeting.id === meetingId && r.isLogged) || false;
    }, [state.results]);

    return {
        ...state,
        compareMeetings,
        getTimeEntryForMeeting,
        isMeetingLogged
    };
} 