import { AuthCredentials } from '@strzel-sobie/common';

export interface IAuthRepository {
  saveCredentials(userId: number, passwordHash: string): Promise<void>;
  findCredentialsByUserId(userId: number): Promise<AuthCredentials | null>;
}
