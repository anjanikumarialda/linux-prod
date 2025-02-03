'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DateRange } from 'react-day-picker';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { MeetingsList } from '@/components/dashboard/meetings-list';
import { Meeting, MatchingResult, MeetingTaskMatch, TaskMatch, TimeEntry } from '@/lib/types';
import { IntervalKeyModal } from '@/components/dashboard/interval-key-modal';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useMeetingsComparison } from '@/hooks/use-meetings-comparison';
import { IntervalsAPI } from '@/lib/intervals-api';
import { getIntervalsApiKey, extractDurationFromAttendance, calculateDurationFromScheduled, cacheLastMeeting, getLastMeetingFromCache, formatToIST } from '@/lib/utils';
import { MeetingMatches } from '@/components/dashboard/meeting-matches';
import { TaskMatchingService } from '@/lib/task-matching-service';
import { VersionFooter } from '@/components/ui/version-footer';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [showOnlyUnlogged] = useState(true);
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [lastPostedMeeting, setLastPostedMeeting] = useState<Meeting | null>(null);
  const [lastPostedError, setLastPostedError] = useState<string | null>(null);

  const {
    isLoading: isComparing,
    compareMeetings,
    isMeetingLogged,
  } = useMeetingsComparison({
    userEmail: session?.user?.email || '',
  });

  useEffect(() => {
    if (session?.user?.email) {
      const apiKey = getIntervalsApiKey(session.user.email);
      setShowApiKeyModal(!apiKey);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    const fetchLastPostedMeeting = async () => {
      if (!session?.user?.email) {
        console.log('No user email found');
        return;
      }

      const intervalsKey = getIntervalsApiKey(session.user.email);
      if (!intervalsKey) {
        console.log('No intervals key found');
        return;
      }

      try {
        setLastPostedError(null);
        console.log('Fetching last posted meeting...');
        
        // First try to get from cache
        const cached = getLastMeetingFromCache();
        console.log('Cached meeting:', cached);
        if (cached?.meeting) {
          console.log('Setting meeting from cache:', cached.meeting);
          setLastPostedMeeting(cached.meeting);
        }

        // Then fetch from API regardless of cache to ensure we have the latest
        const response = await fetch(
          `/api/meetings/latest?userEmail=${encodeURIComponent(session.user.email)}&intervalsKey=${encodeURIComponent(intervalsKey)}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch last posted meeting');
        }

        const meeting = await response.json();
        console.log('Last posted meeting response:', meeting);
        
        if (meeting) {
          console.log('Setting last posted meeting:', meeting);
          setLastPostedMeeting(meeting);
          cacheLastMeeting(meeting);
        } else if (!cached?.meeting) {
          // Only show no meetings message if we don't have a cached meeting
          console.log('No last posted meeting found');
          setLastPostedMeeting(null);
        }
      } catch (error) {
        console.error('Error fetching last posted meeting:', error);
        setLastPostedError(error instanceof Error ? error.message : 'Failed to fetch last posted meeting');
      }
    };

    // Fetch immediately on mount
    fetchLastPostedMeeting();

    // Also set up an interval to fetch every minute
    const intervalId = setInterval(fetchLastPostedMeeting, 60000);

    // Setup event listener for real-time updates
    const handleMeetingPosted = (event: CustomEvent<{ meeting: Meeting }>) => {
      console.log('Meeting posted event received:', event.detail);
      setLastPostedMeeting(event.detail.meeting);
      setLastPostedError(null);
    };

    window.addEventListener('meetingPosted', handleMeetingPosted as EventListener);
    
    return () => {
      window.removeEventListener('meetingPosted', handleMeetingPosted as EventListener);
      clearInterval(intervalId);
    };
  }, [session?.user?.email]);

  const handleDateRangeChange = async (range: DateRange | undefined) => {
    console.log('Date range changed:', range);
    setDateRange(range);
    setMatchingResult(null); // Reset matching results when date range changes
  };

  const handleLogMeetings = async (meetingsToLog: Meeting[]) => {
    if (!session?.user?.email) {
      toast({
        title: 'Error',
        description: 'User email not found. Please try signing out and back in.',
        variant: 'destructive',
      });
      return;
    }

    const apiKey = getIntervalsApiKey(session.user.email);
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    try {
      const intervalsApi = new IntervalsAPI(apiKey);
      await intervalsApi.logMeetings(meetingsToLog);

      // Find the most recent meeting
      const mostRecentMeeting = meetingsToLog.reduce((latest, current) => {
        return new Date(current.start.dateTime) > new Date(latest.start.dateTime) 
          ? current 
          : latest;
      }, meetingsToLog[0]);
      
      // Update the last posted meeting immediately
      setLastPostedMeeting(mostRecentMeeting);
      cacheLastMeeting(mostRecentMeeting);

      // Refresh the meetings list
      const { unloggedMeetings } = await compareMeetings(meetings);
      
      if (showOnlyUnlogged) {
        setMeetings(unloggedMeetings);
      }

      toast({
        title: 'Success',
        description: `Successfully logged ${meetingsToLog.length} meetings to Intervals.`,
      });
    } catch (error) {
      console.error('Failed to log meetings:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to log meetings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchMeetings = async () => {
    if (!dateRange?.from || !dateRange?.to || !session?.user?.email) {
      toast({
        title: "Select Date Range",
        description: "Please select a date range to fetch meetings.",
        variant: "destructive",
      });
      return;
    }

    const intervalsKey = getIntervalsApiKey(session.user.email);
    if (!intervalsKey) {
      setShowApiKeyModal(true);
      return;
    }

    setIsLoadingMeetings(true);
    try {
      const startDateTime = format(dateRange.from, "yyyy-MM-dd'T'00:00:00'Z'");
      const endDateTime = format(dateRange.to, "yyyy-MM-dd'T'23:59:59'Z'");
      
      const response = await fetch(
        `/api/meetings?userEmail=${encodeURIComponent(session.user.email)}&startDateTime=${startDateTime}&endDateTime=${endDateTime}&intervalsKey=${encodeURIComponent(intervalsKey)}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch meetings');
      }

      const data = await response.json();
      setMeetings(data);
      
      toast({
        title: "Meetings Fetched",
        description: `Found ${data.length} unlogged meetings in the selected date range.`
      });
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch meetings",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const handleMatchMeetings = async () => {
    if (!meetings.length) {
      toast({
        title: "No Meetings",
        description: "Please fetch meetings first before matching with tasks.",
        variant: "destructive",
      });
      return;
    }

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
      setShowApiKeyModal(true);
      return;
    }

    setIsMatching(true);
    try {
      const response = await fetch('/api/azure-openai-key');
      if (!response.ok) {
        throw new Error('Failed to get Azure OpenAI key');
      }
      const { apiKey: openAIKey } = await response.json();

      const matchingService = new TaskMatchingService(openAIKey, intervalsKey);
      const result = await matchingService.matchMeetings(meetings);
      
      setMatchingResult(result);
      toast({
        title: "Matching Complete",
        description: `Matched ${result.matchedMeetings.length} out of ${result.totalProcessed} meetings.`,
      });
    } catch (error) {
      console.error('Error matching meetings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to match meetings with tasks",
        variant: "destructive",
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleConfirmMatch = async (meeting: MeetingTaskMatch, taskId: string) => {
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
      setShowApiKeyModal(true);
      return;
    }

    try {
      const intervalsApi = new IntervalsAPI(intervalsKey);
      
      // Find the selected task match from the meeting's matches
      const selectedMatch = meeting.matches.find(match => match.taskId === taskId);
      if (!selectedMatch) {
        throw new Error('Selected task match not found');
      }

      // Calculate duration from actual attendance if available, otherwise use scheduled duration
      const duration = meeting.meeting.actualAttendance 
        ? extractDurationFromAttendance(meeting.meeting.actualAttendance)
        : calculateDurationFromScheduled(meeting.meeting.start.dateTime, meeting.meeting.end.dateTime);

      // Prepare the time entry data
      const timeEntry: TimeEntry = {
        date: format(new Date(meeting.meeting.start.dateTime), 'yyyy-MM-dd'),
        duration: duration,
        taskId: selectedMatch.taskId,
        projectid: selectedMatch.projectid,
        notes: meeting.meeting.subject,
        billable: true,
        description: meeting.meeting.subject
      };

      // Log the time entry to Intervals
      await intervalsApi.logTimeEntry(timeEntry);

      // Update last posted meeting immediately
      setLastPostedMeeting(meeting.meeting);
      cacheLastMeeting(meeting.meeting);

      // Update the matching result to reflect the logged meeting
      setMatchingResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          matchedMeetings: prev.matchedMeetings.filter(m => m.meeting.id !== meeting.meeting.id),
          unmatchedMeetings: prev.unmatchedMeetings.filter(m => m.meeting.id !== meeting.meeting.id),
        };
      });

      // Update the meetings list to remove the logged meeting if showing only unlogged
      if (showOnlyUnlogged) {
        setMeetings(prev => prev.filter(m => m.id !== meeting.meeting.id));
      }

      toast({
        title: "Success",
        description: `Successfully logged meeting "${meeting.meeting.subject}" to task "${selectedMatch.taskName}"`,
      });
    } catch (error) {
      console.error('Error confirming match:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to confirm match",
        variant: "destructive",
      });
    }
  };

  const handleConfirmBulkMatches = async (
    matches: { meeting: MeetingTaskMatch; taskId: string }[]
  ) => {
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
      setShowApiKeyModal(true);
      return;
    }

    try {
      const intervalsApi = new IntervalsAPI(intervalsKey);
      let successCount = 0;
      let errorCount = 0;

      // Process matches in sequence to avoid overwhelming the API
      for (const { meeting, taskId } of matches) {
        try {
          const selectedMatch = meeting.matches.find(match => match.taskId === taskId);
          if (!selectedMatch) {
            errorCount++;
            continue;
          }

          const duration = meeting.meeting.actualAttendance 
            ? extractDurationFromAttendance(meeting.meeting.actualAttendance)
            : calculateDurationFromScheduled(meeting.meeting.start.dateTime, meeting.meeting.end.dateTime);

          const timeEntry = {
            date: format(new Date(meeting.meeting.start.dateTime), 'yyyy-MM-dd'),
            duration: duration,
            taskId: selectedMatch.taskId,
            projectid: selectedMatch.projectid,
            notes: meeting.meeting.subject,
          };

          await intervalsApi.logTimeEntry(timeEntry);
          successCount++;
        } catch (error) {
          console.error('Error logging meeting:', error);
          errorCount++;
        }
      }

      // Update the matching result to reflect the logged meetings
      setMatchingResult(prev => {
        if (!prev) return null;
        const loggedMeetingIds = new Set(matches.map(m => m.meeting.meeting.id));
        return {
          ...prev,
          matchedMeetings: prev.matchedMeetings.filter(m => !loggedMeetingIds.has(m.meeting.id)),
          unmatchedMeetings: prev.unmatchedMeetings.filter(m => !loggedMeetingIds.has(m.meeting.id)),
        };
      });

      // Update the meetings list if showing only unlogged
      if (showOnlyUnlogged) {
        const loggedMeetingIds = new Set(matches.map(m => m.meeting.meeting.id));
        setMeetings(prev => prev.filter(m => !loggedMeetingIds.has(m.id)));
      }

      toast({
        title: "Bulk Confirmation Complete",
        description: `Successfully logged ${successCount} meetings${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
        variant: errorCount > 0 ? "destructive" : "default",
      });
    } catch (error) {
      console.error('Error confirming bulk matches:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to confirm matches",
        variant: "destructive",
      });
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Not Authenticated</h2>
          <p className="text-muted-foreground">Please sign in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingMeetings || isComparing;

  return (
    <>
      <div className="container mx-auto py-6">
        {lastPostedMeeting ? (
          <div className="fixed top-[4.5rem] right-4 z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background/95 backdrop-blur-sm border rounded-md text-xs shadow-sm hover:bg-background/100 transition-colors">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Last Posted:</span>
                    <span className="truncate max-w-[200px]" title={lastPostedMeeting.subject}>
                      {lastPostedMeeting.subject}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatToIST(lastPostedMeeting.start.dateTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed top-[4.5rem] right-4 z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background/95 backdrop-blur-sm border rounded-md text-xs shadow-sm">
              <span className="text-muted-foreground">No recently posted meetings</span>
            </div>
          </div>
        )}
        {lastPostedError && (
          <div className="fixed top-[4.5rem] right-4 z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 backdrop-blur-sm border-destructive/20 border rounded-md text-xs text-destructive shadow-sm">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 bg-destructive rounded-full"></div>
                </div>
                <span>{lastPostedError}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-8">
          {/* Date Range Picker and Fetch Button Section */}
          <div className="flex flex-col items-center gap-4 mt-4">
            <div className="flex items-center gap-4">
              <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
              <Button
                onClick={fetchMeetings}
                disabled={isLoadingMeetings || !dateRange?.from || !dateRange?.to}
              >
                {isLoadingMeetings ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fetch Meetings
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Meetings List Section */}
          {meetings.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight">Fetched Meetings</h2>
                <Button
                  onClick={handleMatchMeetings}
                  disabled={isMatching}
                  variant="secondary"
                >
                  {isMatching ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                      Matching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Match with Tasks
                    </>
                  )}
                </Button>
              </div>

              <MeetingsList
                meetings={meetings}
                isLoading={isLoading}
                isMeetingLogged={isMeetingLogged}
              />

              {matchingResult && (
                <MeetingMatches
                  matchingResult={matchingResult}
                  onConfirmMatch={handleConfirmMatch}
                  onConfirmBulkMatches={handleConfirmBulkMatches}
                  isProcessing={isMatching}
                />
              )}
            </div>
          )}
        </div>
        <IntervalKeyModal
          open={showApiKeyModal}
          onOpenChange={setShowApiKeyModal}
        />
      </div>
      
      <VersionFooter />
    </>
  );
} 