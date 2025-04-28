// src/types/actionLog.ts
export interface ActionLog {
  action: string;
  timestamp: string;
  sessionId: string;
  philosopherId: string;
  details?: Record<string, string>;
}