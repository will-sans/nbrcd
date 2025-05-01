// types/actionLog.ts
export interface ActionLog {
  action: string;
  timestamp: Date; // 型を Date に変更
  sessionId: string;
  philosopherId: string;
  category?: string;
  details?: Record<string, string>;
  userId: number;
}