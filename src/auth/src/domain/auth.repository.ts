export interface IAuthRepository {
  saveCredentials(userId: number, passwordHash: string): Promise<void>;
}
