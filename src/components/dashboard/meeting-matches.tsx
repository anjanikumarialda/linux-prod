'use client';

import { useState, useEffect } from 'react';
import { MeetingTaskMatch, MatchingResult, TaskMatch } from '@/lib/types';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Percent,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  PencilLine
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TaskSelectionModal } from './task-selection-modal';
import { formatToIST } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { IntervalsAPI } from '@/lib/intervals-api';
import { getIntervalsApiKey } from '@/lib/utils';

interface MeetingMatchesProps {
  matchingResult: MatchingResult;
  onConfirmMatch: (meeting: MeetingTaskMatch, taskId: string) => Promise<void>;
  onConfirmBulkMatches: (matches: { meeting: MeetingTaskMatch; taskId: string }[]) => Promise<void>;
  isProcessing: boolean;
}

type SortField = 'date' | 'confidence' | 'subject';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'matched' | 'unmatched' | 'error';

export function MeetingMatches({
  matchingResult: initialMatchingResult,
  onConfirmMatch,
  onConfirmBulkMatches,
  isProcessing
}: MeetingMatchesProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [matchingResult, setMatchingResult] = useState<MatchingResult>(initialMatchingResult);
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());
  const [processingMeetings, setProcessingMeetings] = useState<Set<string>>(new Set());
  const [selectedMeetings, setSelectedMeetings] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<MeetingTaskMatch | null>(null);
  const [availableTasks, setAvailableTasks] = useState<TaskMatch[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  useEffect(() => {
    setMatchingResult(initialMatchingResult);
  }, [initialMatchingResult]);

  const toggleMeeting = (meetingId: string) => {
    const newExpanded = new Set(expandedMeetings);
    if (newExpanded.has(meetingId)) {
      newExpanded.delete(meetingId);
    } else {
      newExpanded.add(meetingId);
    }
    setExpandedMeetings(newExpanded);
  };

  const toggleMeetingSelection = (meetingId: string) => {
    const newSelected = new Set(selectedMeetings);
    if (newSelected.has(meetingId)) {
      newSelected.delete(meetingId);
    } else {
      newSelected.add(meetingId);
    }
    setSelectedMeetings(newSelected);
  };

  const toggleAllMeetings = () => {
    if (selectedMeetings.size === filteredMeetings.length) {
      setSelectedMeetings(new Set());
    } else {
      setSelectedMeetings(new Set(filteredMeetings.map(m => m.meeting.id)));
    }
  };

  const handleConfirmMatch = async (meeting: MeetingTaskMatch, taskId: string) => {
    if (!onConfirmMatch) return;

    setProcessingMeetings(prev => new Set(prev).add(meeting.meeting.id));
    try {
      let meetingToConfirm = meeting;
      
      // For unmatched meetings or when changing match
      if (availableTasks.length > 0) {
        const selectedTask = availableTasks.find(task => task.taskId === taskId);
        if (!selectedTask) {
          throw new Error('Selected task not found');
        }

        // Create a new meeting with the selected task as a match
        meetingToConfirm = {
          ...meeting,
          matches: [selectedTask],
          status: 'matched'
        };
      }

      await onConfirmMatch(meetingToConfirm, taskId);
      
      setSelectedMeetings(prev => {
        const next = new Set(prev);
        next.delete(meeting.meeting.id);
        return next;
      });
    } finally {
      setProcessingMeetings(prev => {
        const next = new Set(prev);
        next.delete(meeting.meeting.id);
        return next;
      });
    }
  };

  const handleConfirmBulkMatches = async () => {
    if (!onConfirmBulkMatches) return;

    const bulkMatches = Array.from(selectedMeetings).map(meetingId => {
      const meeting = allMeetings.find(m => m.meeting.id === meetingId);
      if (!meeting || !meeting.matches.length) return null;
      return {
        meeting,
        taskId: meeting.matches[0].taskId // Select the highest confidence match
      };
    }).filter((match): match is { meeting: MeetingTaskMatch; taskId: string } => match !== null);

    if (bulkMatches.length === 0) return;

    try {
      await onConfirmBulkMatches(bulkMatches);
      setSelectedMeetings(new Set());
    } catch (error) {
      console.error('Error confirming bulk matches:', error);
    }
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 80) return 'default';
    if (confidence >= 50) return 'secondary';
    return 'outline';
  };

  const allMeetings = [...matchingResult.matchedMeetings, ...matchingResult.unmatchedMeetings];

  const sortMeetings = (meetings: MeetingTaskMatch[]) => {
    // First deduplicate meetings by ID
    const uniqueMeetings = meetings.reduce((acc, meeting) => {
      if (!acc.some(m => m.meeting.id === meeting.meeting.id)) {
        acc.push(meeting);
      }
      return acc;
    }, [] as MeetingTaskMatch[]);

    // Then sort the unique meetings
    return uniqueMeetings.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.meeting.start.dateTime).getTime() - new Date(b.meeting.start.dateTime).getTime();
          break;
        case 'confidence':
          const aConfidence = a.matches[0]?.confidence || 0;
          const bConfidence = b.matches[0]?.confidence || 0;
          comparison = aConfidence - bConfidence;
          break;
        case 'subject':
          comparison = a.meeting.subject.localeCompare(b.meeting.subject);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const filterMeetings = (meetings: MeetingTaskMatch[]) => {
    return meetings.filter(meeting => {
      switch (filterStatus) {
        case 'matched':
          return meeting.status === 'matched';
        case 'unmatched':
          return meeting.status === 'unmatched';
        case 'error':
          return meeting.status === 'error';
        default:
          return true;
      }
    });
  };

  const filteredMeetings = sortMeetings(filterMeetings(allMeetings));

  const handleChangeMatch = async (meeting: MeetingTaskMatch) => {
    if (!session?.user?.email) {
      toast({
        title: "Error",
        description: "User email not found. Please try signing out and back in.",
        variant: "destructive",
      });
      return;
    }

    const intervalsKey = getIntervalsApiKey(session.user.email);
    if (!intervalsKey) {
      toast({
        title: "Error",
        description: "Please set your Intervals API key first.",
        variant: "destructive",
      });
      return;
    }

    setCurrentMeeting(meeting);
    setIsLoadingTasks(true);

    try {
      const intervalsApi = new IntervalsAPI(intervalsKey);
      const tasks = await intervalsApi.getTasks();
      
      // Convert tasks to TaskMatch format
      const taskMatches: TaskMatch[] = tasks
        .filter(task => {
          // Log each task for debugging
          console.log('Processing task:', task);
          
          // Ensure task has required fields
          const hasRequiredFields = task.id && task.name && task.project?.id;
          
          if (!hasRequiredFields) {
            console.log('Skipping task due to missing required fields:', task);
          }
          
          return hasRequiredFields;
        })
        .map(task => {
          // Get project ID from project object
          const projectId = task.project?.id;
          
          // Get project name from project object or use default
          const projectName = task.project?.name || 'Unknown Project';
          
          const taskMatch: TaskMatch = {
            taskId: task.id,
            taskName: task.name,
            projectid: projectId,
            projectName,
            confidence: 0,
            matchReason: 'Manually selected'
          };
          
          console.log('Created task match:', taskMatch);
          return taskMatch;
        });

      setAvailableTasks(taskMatches);
      setShowTaskModal(true);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleAddMatch = async (meeting: MeetingTaskMatch) => {
    if (!session?.user?.email) {
      toast({
        title: "Error",
        description: "User email not found. Please try signing out and back in.",
        variant: "destructive",
      });
      return;
    }

    const intervalsKey = getIntervalsApiKey(session.user.email);
    if (!intervalsKey) {
      toast({
        title: "Error",
        description: "Please set your Intervals API key first.",
        variant: "destructive",
      });
      return;
    }

    setCurrentMeeting(meeting);
    setIsLoadingTasks(true);

    try {
      const intervalsApi = new IntervalsAPI(intervalsKey);
      const tasks = await intervalsApi.getTasks();
      
      console.log('Raw tasks from API:', tasks);
      
      // Convert tasks to TaskMatch format
      const taskMatches: TaskMatch[] = tasks
        .filter(task => {
          // Log each task for debugging
          console.log('Processing task:', task);
          
          // Ensure task has required fields
          const hasRequiredFields = task.id && task.name && task.project?.id;
          
          if (!hasRequiredFields) {
            console.log('Skipping task due to missing required fields:', task);
          }
          
          return hasRequiredFields;
        })
        .map(task => {
          // Get project ID from project object
          const projectId = task.project?.id;
          
          // Get project name from project object or use default
          const projectName = task.project?.name || 'Unknown Project';
          
          const taskMatch: TaskMatch = {
            taskId: task.id,
            taskName: task.name,
            projectid: projectId,
            projectName,
            confidence: 0,
            matchReason: 'Manually selected'
          };
          
          console.log('Created task match:', taskMatch);
          return taskMatch;
        });

      console.log('Final available tasks:', taskMatches);
      setAvailableTasks(taskMatches);
      setShowTaskModal(true);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleTaskSelect = async (taskId: string) => {
    if (!currentMeeting) return;

    try {
      // Find the selected task from available tasks
      const selectedTask = availableTasks.find(task => task.taskId === taskId);
      if (!selectedTask) {
        throw new Error('Selected task not found');
      }

      // Create updated meeting with the selected task
      const updatedMeeting: MeetingTaskMatch = {
        ...currentMeeting,
        matches: [selectedTask],
        status: 'matched'
      };

      // Update the matching result state
      setMatchingResult(prev => {
        // Remove the meeting from both matched and unmatched lists
        const filteredMatched = prev.matchedMeetings.filter(
          m => m.meeting.id !== currentMeeting.meeting.id
        );
        const filteredUnmatched = prev.unmatchedMeetings.filter(
          m => m.meeting.id !== currentMeeting.meeting.id
        );

        // Add the updated meeting to matched list
        return {
          ...prev,
          matchedMeetings: [...filteredMatched, updatedMeeting],
          unmatchedMeetings: filteredUnmatched,
          // Update success rate
          successRate: ((filteredMatched.length + 1) / prev.totalProcessed) * 100
        };
      });

      // Close the modal without posting to Intervals yet
      setShowTaskModal(false);
      setCurrentMeeting(null);

      toast({
        title: "Task Selected",
        description: "Task has been selected. Click 'Confirm Match' to post to Intervals.",
      });
    } catch (error) {
      console.error('Error selecting task:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to select task",
        variant: "destructive",
      });
    }
  };

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Meeting Matches</h2>
          <p className="text-sm text-muted-foreground">
            {matchingResult.totalProcessed} meetings processed • {matchingResult.matchedMeetings.length} matched • 
            {matchingResult.successRate.toFixed(1)}% success rate
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                All Meetings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('matched')}>
                Matched Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('unmatched')}>
                Unmatched Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('error')}>
                Errors Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setSortField('date');
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              }}>
                Sort by Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortField('confidence');
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              }}>
                Sort by Confidence
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortField('subject');
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              }}>
                Sort by Subject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedMeetings.size > 0 && (
            <Button
              size="sm"
              onClick={handleConfirmBulkMatches}
              disabled={isProcessing}
            >
              Confirm Selected ({selectedMeetings.size})
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0"
                  onClick={toggleAllMeetings}
                >
                  {selectedMeetings.size === filteredMeetings.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead className="w-[180px]">Meeting</TableHead>
              <TableHead className="w-[220px]">Date & Time</TableHead>
              <TableHead className="w-[180px]">Duration</TableHead>
              <TableHead className="w-[200px]">Task</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMeetings.map((meeting) => {
              const isExpanded = expandedMeetings.has(meeting.meeting.id);
              const isSelected = selectedMeetings.has(meeting.meeting.id);
              const isMatched = meeting.status === 'matched';
              const startTime = new Date(meeting.meeting.start.dateTime);
              const endTime = new Date(meeting.meeting.end.dateTime);

              return (
                <React.Fragment key={meeting.meeting.id}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMeetingSelection(meeting.meeting.id);
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{meeting.meeting.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(startTime, 'MMM dd, yyyy')} IST</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{format(startTime, 'hh:mm a')} - {format(endTime, 'hh:mm a')} IST</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div>
                          <span>Scheduled: </span>
                          <span>{meeting.meeting.scheduledDuration}</span>
                        </div>
                        <div className="text-muted-foreground whitespace-nowrap">
                          <span>Actual: </span>
                          <span>{meeting.meeting.actualAttendance}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {isMatched && meeting.matches[0] ? (
                          <>
                            <div className="font-medium">{meeting.matches[0].taskName}</div>
                            <div className="text-sm text-muted-foreground">
                              Project: {meeting.matches[0].projectName}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No task selected</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isMatched ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          ✓ Matched
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          × No Match
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isMatched ? (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleChangeMatch(meeting)}>
                              <PencilLine className="h-4 w-4 mr-2" />
                              Change Match
                            </Button>
                            {meeting.matches[0] && (
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => handleConfirmMatch(meeting, meeting.matches[0].taskId)}
                                disabled={processingMeetings.has(meeting.meeting.id)}
                              >
                                {processingMeetings.has(meeting.meeting.id) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Confirming...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Confirm Match
                                  </>
                                )}
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleAddMatch(meeting)}>
                            <PencilLine className="h-4 w-4 mr-2" />
                            Select Task
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <TaskSelectionModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        onSelectTask={handleTaskSelect}
        availableTasks={availableTasks}
        title={currentMeeting?.matches.length ? "Change Task Match" : "Select Task"}
        isLoading={isLoadingTasks}
      />
    </div>
  );
} 