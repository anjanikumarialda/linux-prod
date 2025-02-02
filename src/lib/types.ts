import { Meeting, Project, Task, TaskMatch, MeetingTaskMatch, MatchingResult, TimeEntry } from '../types';

export interface MeetingDateTime {
  dateTime: string;
  timeZone: string;
}

export interface User {
  id: string;
  personid?: string;
  name?: string;
  email?: string;
}

export interface Module {
  id: string;
  name: string;
}

export interface WorkType {
  id: string;
  worktype: string;
  worktypeid: string;
  projectid: string;
}

export interface ComparisonResult {
  meeting: Meeting;
  timeEntry?: TimeEntry;
  isLogged: boolean;
}

export type { Meeting, Project, Task, TaskMatch, MeetingTaskMatch, MatchingResult, TimeEntry }; 