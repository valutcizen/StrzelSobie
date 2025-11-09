import { SessionData } from '@strzel-sobie/common/models';

export interface ISessionRepository {
  createSession(session: SessionData): Promise<string>;
  getSession(token: string): Promise<SessionData | null>;
  deleteSession(token: string): Promise<void>;
}
