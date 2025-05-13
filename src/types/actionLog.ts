export interface ActionLog {
  action: string;
  timestamp: string;
  sessionId: string;
  philosopherId: string;
  category: string;
  details?: Record<string, string>;
  userId: string;
}
