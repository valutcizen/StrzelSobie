import { describe, it } from 'vitest';
import type { IUserService } from '@strzel-sobie/common/src/users/service';

type ContractSubject = IUserService;

describe('UserService contract', () => {
  it.todo('validates that the @strzel-sobie/users implementation satisfies IUserService');
});
