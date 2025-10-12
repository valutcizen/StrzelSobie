export interface ISessionRepository {
  createSession(userId: number): Promise<string>;
  getSession(token: string): Promise<number | null>;
}
