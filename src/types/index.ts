import { Meeting } from './meeting';

export type { Meeting };

export interface Project {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  projectid: string;
  project: string;
}

export interface TaskMatch {
  taskId: string;
  taskName: string;
  projectid: string;
  projectName: string;
  confidence: number;
  matchReason: string;
}

export interface MeetingTaskMatch {
  meeting: Meeting;
  matches: TaskMatch[];
  status: 'matched' | 'unmatched' | 'error';
}

export interface MatchingResult {
  matchedMeetings: MeetingTaskMatch[];
  unmatchedMeetings: MeetingTaskMatch[];
  totalProcessed: number;
  successRate: number;
}

export interface TimeEntry {
  id?: string;
  date: string;
  time?: string;
  duration: number;
  description?: string;
  billable?: boolean;
  person?: string;
  taskId: string;
  projectid: string;
  notes?: string;
} 