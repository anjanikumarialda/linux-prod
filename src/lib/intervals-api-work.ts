import { User, Project, Module, Task, WorkType, TimeEntry } from '@/lib/types';

export interface TimeEntryPayload {
    person: User;
    date: string;
    time: number;
    project: Project;
    module: Module;
    task: Task;
    workType: WorkType;
    billable?: boolean;
    description?: string;
} 