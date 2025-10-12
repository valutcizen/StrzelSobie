import { SessionData } from '@strzel-sobie/common';

export interface ISessionRepository {
  createSession(session: SessionData): Promise<string>;
  getSession(token: string): Promise<SessionData | null>;
  deleteSession(token: string): Promise<void>;
}
