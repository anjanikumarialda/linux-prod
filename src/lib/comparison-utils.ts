import { Meeting, TimeEntry, ComparisonResult } from './types';
import { extractDurationFromAttendance } from './utils';

/**
 * Formats a date to YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Calculates the duration of a meeting in hours, rounded to 2 decimal places
 */
export function calculateMeetingDuration(meeting: Meeting): number {
    // If actual attendance is available, use that
    if (meeting.actualAttendance) {
        return extractDurationFromAttendance(meeting.actualAttendance);
    }
    
    // Otherwise use scheduled duration
    const start = new Date(meeting.start.dateTime);
    const end = new Date(meeting.end.dateTime);
    const durationMs = end.getTime() - start.getTime();
    const hours = durationMs / (1000 * 60 * 60); // Convert to hours
    return Number(hours.toFixed(2)); // Round to 2 decimal places
}

/**
 * Checks if a meeting subject matches a time entry description
 */
export function isMeetingDescriptionMatch(meetingSubject: string, timeEntryDescription: string): boolean {
    const normalizedSubject = meetingSubject.toLowerCase().trim();
    const normalizedDescription = timeEntryDescription.toLowerCase().trim();
    
    // Direct match
    if (normalizedSubject === normalizedDescription) {
        return true;
    }

    // Remove common prefixes/suffixes and compare
    const cleanSubject = normalizedSubject
        .replace(/^teams\s+meeting:\s*/i, '')
        .replace(/\s*\(online\)$/i, '')
        .trim();
    const cleanDescription = normalizedDescription
        .replace(/^teams\s+meeting:\s*/i, '')
        .replace(/\s*\(online\)$/i, '')
        .trim();

    return cleanSubject === cleanDescription;
}

/**
 * Compares meetings with time entries to identify which meetings are already logged
 */
export async function compareMeetingsWithTimeEntries(
    meetings: Meeting[],
    timeEntries: TimeEntry[]
): Promise<ComparisonResult[]> {
    return meetings.map(meeting => {
        const meetingDate = formatDate(new Date(meeting.start.dateTime));
        const meetingDuration = calculateMeetingDuration(meeting);
        
        // Find matching time entry
        const timeEntry = timeEntries.find(entry => {
            // Match by date
            const dateMatch = entry.date === meetingDate;
            if (!dateMatch) return false;

            // Match by description/subject
            const descriptionMatch = isMeetingDescriptionMatch(meeting.subject, entry.description || '');
            if (!descriptionMatch) return false;

            // Match by exact duration (rounded to 2 decimal places)
            const timeEntryDuration = Number(Number(entry.time).toFixed(2));
            const durationMatch = meetingDuration === timeEntryDuration;

            return durationMatch;
        });

        return {
            meeting,
            timeEntry,
            isLogged: !!timeEntry
        };
    });
}

/**
 * Filters meetings to return only unlogged ones
 */
export function getUnloggedMeetings(comparisonResults: ComparisonResult[]): Meeting[] {
    return comparisonResults
        .filter(result => !result.isLogged)
        .map(result => result.meeting);
} 