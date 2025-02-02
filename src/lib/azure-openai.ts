'use client';

import { Meeting } from './types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: {
    message: ChatMessage;
    finish_reason: string;
  }[];
}

interface Task {
  id: string;
  name: string;
  description?: string;
  project?: {
    name: string;
    id: string;
  };
}

export class AzureOpenAIService {
  private apiEndpoint = 'https://rajes-m5gtblwr-eastus2.cognitiveservices.azure.com/openai/deployments/gpt-4/chat/completions';
  private apiVersion = '2024-08-01-preview';  // Updated for turbo-2024-04-09 version
  private apiKey: string;
  private maxRetries = 5;
  private baseDelay = 3000; // Increased for GPT-4's lower rate limits

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeRequest(messages: ChatMessage[], retryCount = 0): Promise<ChatCompletionResponse> {
    try {
      // Add delay between requests to respect GPT-4's rate limits (48 requests per minute = ~1.25 seconds per request)
      await this.sleep(1500); // 1.5 seconds between requests to be safe

      const response = await fetch(`${this.apiEndpoint}?api-version=${this.apiVersion}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify({
          messages,
          temperature: 0.3,
          max_tokens: 400, // Reduced to stay within token limits
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0,
          stop: null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 429 && retryCount < this.maxRetries) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '0');
          const waitTime = retryAfter > 0 
            ? retryAfter * 1000 
            : Math.min(this.baseDelay * Math.pow(2, retryCount), 60000);

          console.log(`Rate limited. Attempt ${retryCount + 1}/${this.maxRetries}. Retrying after ${waitTime/1000} seconds...`);
          await this.sleep(waitTime);
          return this.makeRequest(messages, retryCount + 1);
        }

        throw new Error(`Azure OpenAI API error: ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const waitTime = Math.min(this.baseDelay * Math.pow(2, retryCount), 60000);
        console.log(`Request failed. Attempt ${retryCount + 1}/${this.maxRetries}. Retrying after ${waitTime/1000} seconds...`);
        await this.sleep(waitTime);
        return this.makeRequest(messages, retryCount + 1);
      }
      throw error;
    }
  }

  async matchMeetingWithTask(meeting: Meeting, availableTasks: Task[]) {
    try {
      console.log('Matching meeting:', meeting.subject);
      console.log('Available tasks:', availableTasks);

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a task matching assistant that analyzes meetings and suggests the most relevant tasks from a list.
                   For each meeting, analyze its subject and details to find matching tasks.
                   
                   Your response MUST follow this EXACT format for each match:
                   Task: taskId - Confidence: number - Reason: brief explanation
                   
                   Rules:
                   1. Only return matches with confidence > 70
                   2. List matches in order of confidence (highest first)
                   3. Return at most 3 matches
                   4. Each match MUST be on a new line
                   5. Use EXACTLY the format specified above (confidence should be a number without % symbol)
                   6. Only return the matches, no other text
                   7. IMPORTANT: Only match tasks that are semantically related to the meeting subject
                   8. If no task is clearly related to the meeting, return no matches
                   9. Meeting subjects about general topics (like "time zone", "status update", etc.) should NOT match with specific project tasks unless explicitly mentioned
                   10. Project codes or acronyms (like "WD", "PM", etc.) in task names should NOT be considered matches unless the meeting subject explicitly mentions the same project code
                   11. The presence of a project code in a task name is NOT sufficient for a match - the meeting subject must be semantically related to the task's actual purpose
                   12. The confidence score should reflect how closely the meeting subject relates to the task's specific purpose, not just matching keywords
                   13. For any match with project-specific tasks (like WD tasks), the meeting subject MUST explicitly reference that project or its full name`
        },
        {
          role: 'user',
          content: `Meeting Details:
                   Subject: ${meeting.subject}
                   Duration: ${meeting.scheduledDuration}
                   Actual Duration: ${meeting.actualAttendance}
                   
                   Available Tasks:
                   ${JSON.stringify(availableTasks, null, 2)}
                   
                   Remember: Do NOT match based on project codes (like WD) unless the meeting explicitly mentions that project.
                   Return the best matching tasks using the required format.`
        }
      ];

      const data = await this.makeRequest(messages);
      const content = data.choices[0].message.content;
      console.log('OpenAI response:', content);
      return content;
    } catch (error) {
      console.error('Error matching meeting with task:', error);
      throw error;
    }
  }

  async batchMatchMeetings(meetings: Meeting[], availableTasks: Task[]) {
    const results = [];
    const batchSize = 2; // Reduced for GPT-4's rate limits
    
    for (let i = 0; i < meetings.length; i += batchSize) {
      const batch = meetings.slice(i, i + batchSize);
      
      // Process each meeting in the batch sequentially
      for (const meeting of batch) {
        try {
          const match = await this.matchMeetingWithTask(meeting, availableTasks);
          results.push({
            meeting,
            matches: match ? match.split('\n').map(line => {
              const [taskInfo, confidence, reason] = line.split(' - ');
              const taskId = taskInfo.split('[')[1].split(']')[0];
              const task = availableTasks.find(t => t.id === taskId);
              if (!task) throw new Error(`Task ${taskId} not found`);
              
              if (!task.project) {
                throw new Error(`Task ${taskId} has no project information`);
              }

              return {
                taskId,
                taskName: task.name,
                projectid: task.project.id,
                projectName: task.project.name,
                confidence: parseInt(confidence.split(':')[1].trim()),
                matchReason: reason.split(':')[1].trim()
              };
            }) : [],
            status: match ? 'matched' : 'unmatched'
          });
        } catch (error) {
          console.error('Error processing meeting:', meeting.subject, error);
          results.push({
            meeting,
            matches: [],
            status: 'error'
          });
        }
      }
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < meetings.length) {
        await this.sleep(3000); // 3 seconds between batches
      }
    }
    return results;
  }
} 