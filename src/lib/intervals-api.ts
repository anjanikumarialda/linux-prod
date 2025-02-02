'use client';

import { Meeting, TimeEntry, Task, Project } from './types';
import { format } from 'date-fns';

// Client-side Intervals API implementation
export class IntervalsAPI {
    private readonly apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async testConnection(): Promise<boolean> {
        console.log('Testing connection to Intervals API...');
        
        try {
            const response = await fetch('/api/interval/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: this.apiKey }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Connection test failed:', errorData);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Connection test error:', error);
            return false;
        }
    }

    async getTasks(): Promise<Task[]> {
        try {
            const response = await fetch('/api/interval/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: this.apiKey }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to fetch tasks: ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.tasks || [];
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    }

    async getProjects(): Promise<Project[]> {
        try {
            const response = await fetch('/api/interval/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: this.apiKey }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to fetch projects: ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.projects || [];
        } catch (error) {
            console.error('Error fetching projects:', error);
            throw error;
        }
    }

    async getTimeEntries(startDate: string, endDate: string): Promise<TimeEntry[]> {
        console.log('Fetching time entries from Intervals API...');
        
        try {
            const response = await fetch('/api/interval/time-entries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    startDate: format(new Date(startDate), 'yyyy-MM-dd'),
                    endDate: format(new Date(endDate), 'yyyy-MM-dd'),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to fetch time entries: ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.timeEntries || [];
        } catch (error) {
            console.error('Error fetching time entries:', error);
            throw error;
        }
    }

    async logTimeEntry(timeEntry: TimeEntry): Promise<void> {
        try {
            const response = await fetch('/api/interval/log-time', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    timeEntry,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to log time entry: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error logging time entry:', error);
            throw error;
        }
    }

    async logMeeting(meeting: Meeting): Promise<TimeEntry> {
        try {
            const response = await fetch('/api/interval/log-meeting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    meeting,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to log meeting: ${errorData.error || 'Unknown error'}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error logging meeting:', error);
            throw error;
        }
    }

    async logMeetings(meetings: Meeting[]): Promise<TimeEntry[]> {
        try {
            const response = await fetch('/api/interval/log-meetings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: this.apiKey,
                    meetings,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to log meetings: ${errorData.error || 'Unknown error'}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error logging meetings:', error);
            throw error;
        }
    }
} 