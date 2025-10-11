import { User } from '../domain/user.entity';
import { IUserRepository } from '../domain/user.repository';

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async createUser(email: string): Promise<User> {
    return this.userRepository.create(email);
  }
}
