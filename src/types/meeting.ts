export interface Meeting {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  scheduledDuration: string;
  actualAttendance?: string;
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  onlineMeeting?: {
    joinUrl: string;
  };
  status?: string;
  platform?: string;
} 