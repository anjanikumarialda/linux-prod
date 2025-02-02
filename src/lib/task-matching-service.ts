'use client';

import { Meeting, Task, Project, MeetingTaskMatch, MatchingResult, TaskMatch } from '../types';
import { AzureOpenAIService } from './azure-openai';
import { IntervalsAPI } from './intervals-api';

interface ParsedMatch {
  taskId: string;
  confidence: number;
  reason: string;
}

interface OpenAITask {
  id: string;
  name: string;
  project: {
    id: string;
    name: string;
  };
}

export class TaskMatchingService {
  private openAIService: AzureOpenAIService;
  private intervalsAPI: IntervalsAPI;
  private tasks: Task[] = [];
  private projects: Project[] = [];

  constructor(openAIKey: string, intervalsAPIKey: string) {
    this.openAIService = new AzureOpenAIService(openAIKey);
    this.intervalsAPI = new IntervalsAPI(intervalsAPIKey);
  }

  async testAzureOpenAIConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/azure-openai-test');
      if (!response.ok) {
        const error = await response.json();
        console.error('Azure OpenAI connection test failed:', error);
        return false;
      }
      const data = await response.json();
      console.log('Azure OpenAI connection test result:', data);
      return data.success === true;
    } catch (error) {
      console.error('Error testing Azure OpenAI connection:', error);
      return false;
    }
  }

  private parseOpenAIResponse(response: string): ParsedMatch[] {
    try {
      // Split response into lines and filter out empty lines
      const lines = response.split('\n').filter(line => line.trim());
      
      const matches = lines.map(line => {
        // Extract task ID, confidence, and reason using regex
        const match = line.match(/Task:\s*(\d+)\s*-\s*Confidence:\s*(\d+)%?\s*-\s*Reason:\s*(.+)$/i);
        
        if (!match) {
          console.warn('Invalid line format:', line);
          return null;
        }

        const [_, taskId, confidence, reason] = match;
        return {
          taskId,
          confidence: parseInt(confidence, 10),
          reason: reason.trim()
        };
      });

      // Filter out null values and sort by confidence
      return matches
        .filter((match): match is ParsedMatch => match !== null)
        .sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Raw response:', response);
      return [];
    }
  }

  private async loadTasksAndProjects() {
    try {
      // Load tasks and projects from Intervals if not already loaded
      if (this.tasks.length === 0) {
        const [tasksResponse, projectsResponse] = await Promise.all([
          this.intervalsAPI.getTasks(),
          this.intervalsAPI.getProjects()
        ]);
        
        // Ensure consistent task structure
        this.tasks = tasksResponse.map(task => ({
          id: task.id,
          title: task.title || (task as any).name,  // Handle potential API response variation
          projectid: task.projectid || (task as any).project?.id,
          project: task.project || ''
        }));
        this.projects = projectsResponse;
      }
    } catch (error) {
      console.error('Error loading tasks and projects:', error);
      throw error;
    }
  }

  private createTaskMatch(parsedMatch: ParsedMatch): TaskMatch | null {
    console.log('Creating task match for:', parsedMatch);
    
    const task = this.tasks.find(t => t.id === parsedMatch.taskId);
    if (!task) {
      console.warn(`Task not found with ID: ${parsedMatch.taskId}`);
      console.log('Available tasks:', this.tasks);
      return null;
    }
    console.log('Found task:', task);

    const projectId = task.projectid;
    if (!projectId) {
      console.warn(`Task ${task.id} has no project information`);
      return null;
    }

    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      console.warn(`Project not found with ID: ${projectId}`);
      console.log('Available projects:', this.projects);
      return null;
    }
    console.log('Found project:', project);

    return {
      taskId: task.id,
      taskName: task.title,
      projectid: project.id,
      projectName: project.name,
      confidence: parsedMatch.confidence,
      matchReason: parsedMatch.reason
    };
  }

  private mapTaskToOpenAIFormat(task: Task): OpenAITask {
    return {
      id: task.id,
      name: task.title,
      project: {
        id: task.projectid,
        name: this.projects.find(p => p.id === task.projectid)?.name || ''
      }
    };
  }

  async matchMeeting(meeting: Meeting): Promise<MeetingTaskMatch> {
    try {
      console.log('Starting task matching for meeting:', meeting.subject);
      await this.loadTasksAndProjects();
      console.log('Loaded tasks and projects:', {
        tasksCount: this.tasks.length,
        projectsCount: this.projects.length
      });

      const openAITasks = this.tasks.map(task => this.mapTaskToOpenAIFormat(task));
      const openAIResponse = await this.openAIService.matchMeetingWithTask(meeting, openAITasks);
      console.log('Raw OpenAI Response:', openAIResponse);
      
      const parsedMatches = this.parseOpenAIResponse(openAIResponse);
      console.log('Parsed Matches:', parsedMatches);
      
      const matches = parsedMatches
        .map(match => {
          const taskMatch = this.createTaskMatch(match);
          if (!taskMatch) {
            console.warn('Failed to create task match for:', match);
          }
          return taskMatch;
        })
        .filter((match): match is TaskMatch => match !== null)
        .sort((a, b) => b.confidence - a.confidence);

      console.log('Final Processed Matches:', matches);

      return {
        meeting,
        matches,
        status: matches.length > 0 ? 'matched' : 'unmatched'
      };
    } catch (error) {
      console.error('Error matching meeting:', error);
      return {
        meeting,
        matches: [],
        status: 'error'
      };
    }
  }

  async matchMeetings(meetings: Meeting[]): Promise<MatchingResult> {
    const results: MeetingTaskMatch[] = [];
    const batchSize = 2; // Process 2 meetings at a time
    const delayBetweenBatches = 30000; // 30 seconds delay between batches
    
    // Process meetings in batches
    for (let i = 0; i < meetings.length; i += batchSize) {
      const batch = meetings.slice(i, i + batchSize);
      
      // Process each meeting in the current batch
      for (const meeting of batch) {
        try {
          const result = await this.matchMeeting(meeting);
          results.push(result);
        } catch (error) {
          console.error(`Error processing meeting ${meeting.id}:`, error);
          results.push({
            meeting,
            matches: [],
            status: 'error'
          });
        }
      }
      
      // Add delay between batches if not the last batch
      if (i + batchSize < meetings.length) {
        console.log(`Waiting ${delayBetweenBatches/1000} seconds before processing next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    const matchedMeetings = results.filter(r => r.status === 'matched');
    const unmatchedMeetings = results.filter(r => r.status !== 'matched');
    const totalProcessed = results.length;
    const successRate = (matchedMeetings.length / totalProcessed) * 100;

    return {
      matchedMeetings,
      unmatchedMeetings,
      totalProcessed,
      successRate
    };
  }

  // Helper method to get task details for display
  getTaskDetails(taskId: string): { task: Task; project: Project } | null {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;

    const project = this.projects.find(p => p.id === task.projectid);
    if (!project) return null;

    return { task, project };
  }
} 