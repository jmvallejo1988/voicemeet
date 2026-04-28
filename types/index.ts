export interface Recording {
  id: string;
  userId: string;
  title: string;
  audioUrl: string;
  duration: number;        // seconds
  transcript: string;
  summary: string;
  keyPoints: string[];
  tasks: string[];
  createdAt: string;       // ISO date
  expiresAt: string;       // ISO date (30 days)
  status: 'processing' | 'ready' | 'error';
}

export interface Meeting {
  id: string;
  userId: string;
  title: string;
  meetSpaceId?: string;
  meetConferenceId?: string;
  audioUrl?: string;
  driveFileId?: string;
  duration: number;
  startTime: string;
  endTime?: string;
  transcript: string;
  summary: string;
  keyPoints: string[];
  tasks: string[];
  attendees: string[];
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  emailSent: boolean;
}

export interface UserSettings {
  openrouterKey: string;
  groqKey:       string;
  recallKey:     string;
  theme: 'dark' | 'light';
  notifyEmail: boolean;
}

export interface SummaryResult {
  transcript: string;
  summary: string;
  keyPoints: string[];
  tasks: string[];
}
