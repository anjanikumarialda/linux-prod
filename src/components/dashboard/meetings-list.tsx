'use client';

import { useState } from 'react';
import { Meeting } from '@/lib/types';
import { format } from 'date-fns';
import { Calendar, Clock, Check, X, Upload, Filter } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import { useSession } from 'next-auth/react';
import { formatToIST } from '@/lib/utils';

interface MeetingsListProps {
  meetings: Meeting[];
  isLoading: boolean;
  isMeetingLogged?: (meetingId: string) => boolean;
}

function formatDuration(startDateTime: string, endDateTime: string): string {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  const durationInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = Math.round(durationInMinutes % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} minutes`;
}

function formatAttendanceDuration(durationInSeconds: number): string {
  const minutes = Math.round(durationInSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes} minutes`;
}

export function MeetingsList({ 
  meetings, 
  isLoading, 
  isMeetingLogged,
}: MeetingsListProps) {
  const { data: session } = useSession();
  const [sortBy, setSortBy] = useState<'date' | 'duration'>('date');

  const sortedMeetings = [...meetings].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime();
    } else {
      const durationA = new Date(a.end.dateTime).getTime() - new Date(a.start.dateTime).getTime();
      const durationB = new Date(b.end.dateTime).getTime() - new Date(b.start.dateTime).getTime();
      return durationA - durationB;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!meetings.length) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No meetings found for the selected date range.
      </div>
    );
  }

  const unloggedCount = meetings.filter(m => !isMeetingLogged?.(m.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {unloggedCount} unlogged meetings
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Sort by {sortBy === 'date' ? 'Date' : 'Duration'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy('date')}>
              Sort by Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('duration')}>
              Sort by Duration
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Meeting</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMeetings.map((meeting) => {
              const startTime = new Date(meeting.start.dateTime);
              const endTime = new Date(meeting.end.dateTime);
              const isLogged = isMeetingLogged?.(meeting.id) ?? false;
              const hasAttendanceData = meeting.actualAttendance !== 'No Data';

              return (
                <TableRow key={meeting.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <span>{meeting.subject}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatToIST(startTime, 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatToIST(startTime, 'hh:mm a')} - {formatToIST(endTime, 'hh:mm a')}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Scheduled:</span>
                        <span>{meeting.scheduledDuration}</span>
                      </div>
                      {hasAttendanceData ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">Actual:</span>
                          <span>{meeting.actualAttendance}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No actual duration data</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {hasAttendanceData ? (
                      <div className="flex flex-col gap-1">
                        <span>Status: {meeting.status}</span>
                        <span className="text-muted-foreground">
                          Duration: {meeting.actualAttendance}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No attendance data</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isLogged ? (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Logged
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <X className="h-3 w-3" />
                        Not Logged
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 