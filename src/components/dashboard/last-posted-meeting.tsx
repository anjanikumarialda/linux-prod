'use client';

import { Meeting } from '@/lib/types';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';

interface LastPostedMeetingProps {
  meeting: Meeting | null;
}

export function LastPostedMeeting({ meeting }: LastPostedMeetingProps) {
  if (!meeting) {
    return null;
  }

  const startTime = new Date(meeting.start.dateTime);
  const endTime = new Date(meeting.end.dateTime);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Last Posted Meeting</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">{meeting.subject}</h3>
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(startTime, 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {format(startTime, 'hh:mm a')} - {format(endTime, 'hh:mm a')}
              </span>
            </div>
          </div>
          {meeting.actualAttendance !== 'No Data' && (
            <div className="text-sm">
              <span className="font-medium">Actual Duration: </span>
              <span>{meeting.actualAttendance}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 