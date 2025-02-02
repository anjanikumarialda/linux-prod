import { Meeting, TimeEntry, ComparisonResult } from './types';
import { IntervalsAPI } from './intervals-api';
import { compareMeetingsWithTimeEntries, formatDate } from './comparison-utils';

interface ComparisonState {
    isLoading: boolean;
    error: string | null;
    results: ComparisonResult[] | null;
}

export class ComparisonService {
    private intervalsApi: IntervalsAPI;
    private state: ComparisonState;

    constructor(intervalsApiKey: string) {
        this.intervalsApi = new IntervalsAPI(intervalsApiKey);
        this.state = {
            isLoading: false,
            error: null,
            results: null
        };
    }

    /**
     * Gets the current state of the comparison process
     */
    getState(): ComparisonState {
        return { ...this.state };
    }

    /**
     * Compares meetings with time entries for a given date range
     */
    async compareMeetings(meetings: Meeting[]): Promise<ComparisonResult[]> {
        try {
            this.state.isLoading = true;
            this.state.error = null;

            // Get date range from meetings
            const dates = meetings.map(m => new Date(m.start.dateTime));
            const startDate = formatDate(new Date(Math.min(...dates.map(d => d.getTime()))));
            const endDate = formatDate(new Date(Math.max(...dates.map(d => d.getTime()))));

            console.log('Fetching time entries for date range:', { startDate, endDate });

            // Fetch time entries
            const timeEntries = await this.intervalsApi.getTimeEntries(startDate, endDate);
            console.log('Time entries fetched:', timeEntries.length);

            // Compare meetings with time entries
            const results = await compareMeetingsWithTimeEntries(meetings, timeEntries);
            console.log('Comparison completed:', {
                total: results.length,
                logged: results.filter(r => r.isLogged).length,
                unlogged: results.filter(r => !r.isLogged).length
            });

            this.state.results = results;
            return results;

        } catch (error) {
            console.error('Error during comparison:', error);
            this.state.error = error instanceof Error ? error.message : 'An error occurred during comparison';
            throw error;
        } finally {
            this.state.isLoading = false;
        }
    }

    /**
     * Gets unlogged meetings from the comparison results
     */
    getUnloggedMeetings(): Meeting[] {
        if (!this.state.results) return [];
        return this.state.results
            .filter(result => !result.isLogged)
            .map(result => result.meeting);
    }

    /**
     * Gets logged meetings from the comparison results
     */
    getLoggedMeetings(): Meeting[] {
        if (!this.state.results) return [];
        return this.state.results
            .filter(result => result.isLogged)
            .map(result => result.meeting);
    }

    /**
     * Gets the matching time entry for a meeting
     */
    getTimeEntryForMeeting(meetingId: string): TimeEntry | undefined {
        if (!this.state.results) return undefined;
        const result = this.state.results.find(r => r.meeting.id === meetingId);
        return result?.timeEntry;
    }

    /**
     * Checks if a specific meeting is logged
     */
    isMeetingLogged(meetingId: string): boolean {
        if (!this.state.results) return false;
        const result = this.state.results.find(r => r.meeting.id === meetingId);
        return result?.isLogged || false;
    }
} 