import { IUserService, MeDto, UserIdentifierDto } from '@strzel-sobie/common';
import { IUserRepository } from '../domain/user.repository';

export class UserService implements IUserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async findUserByEmail(email: string): Promise<UserIdentifierDto | null> {
    return this.userRepository.findByEmail(email);
  }

  async createUser(email: string): Promise<UserIdentifierDto> {
    return this.userRepository.create(email);
  }

  async getFullUserProfile(userId: number): Promise<MeDto | null> {
    return this.userRepository.getFullUserProfile(userId);
  }
}
