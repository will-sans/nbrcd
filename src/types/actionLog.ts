// types/actionLog.ts
export interface ActionLog {
  action: string;
  timestamp: string; // Date から string に変更
  sessionId: string;
  philosopherId: string;
  category?: string;
  details?: Record<string, string>;
  userId: number;
}