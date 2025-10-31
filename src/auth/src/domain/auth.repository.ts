import { AuthCredentials } from '@strzel-sobie/common/models';

export interface IAuthRepository {
  saveCredentials(userId: number, passwordHash: string): Promise<void>;
  findCredentialsByUserId(userId: number): Promise<AuthCredentials | null>;
}
