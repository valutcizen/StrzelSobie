import { OpenAPIRoute, Str, Num } from 'chanfana';
import { z } from 'zod';
import { AppContext } from '../../types';
import { AdminService, AdminDbRepository } from '@strzel-sobie/admin';
import {
  AuthService,
  AuthDbRepository,
  EmailAlreadyExistsError,
} from '@strzel-sobie/auth';
import { UserService, UserDbRepository } from '@strzel-sobie/users';

// Based on RegisterUserCommand from src/common/src/dto/auth.dto.ts
const RegisterUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8), // The plan mentions more complex rules, but this is a start
});

// Based on RegisteredUserDto from src/common/src/dto/auth.dto.ts
const RegisteredUserResponseSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  roles: z.array(z.string()),
});

export class RegisterUser extends OpenAPIRoute {
  schema = {
    tags: ['Auth'],
    summary: 'Register a new user',
    request: {
      body: {
        content: {
          'application/json': {
            schema: RegisterUserRequestSchema,
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'User registered successfully',
        content: {
          'application/json': {
            schema: RegisteredUserResponseSchema,
          },
        },
      },
      '400': {
        description: 'Bad Request - Invalid input',
      },
      '409': {
        description: 'Conflict - Email already registered',
      },
      '500': {
        description: 'Internal Server Error',
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();

    const db = c.env.DB;
    const adminRepository = new AdminDbRepository(db);
    const adminService = new AdminService(adminRepository);
    const userRepository = new UserDbRepository(db);
    const userService = new UserService(userRepository);
    const authRepository = new AuthDbRepository(db);
    const authService = new AuthService(authRepository, userService, adminService);

    const sourceIp = c.req.header('cf-connecting-ip') || 'unknown';
    const proxiedIp = c.req.header('x-forwarded-for') || 'unknown';

    const result = await authService.register(data.body, sourceIp, proxiedIp);

    if (result.isSuccess) {
      return new Response(JSON.stringify(result.getValue()), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      const error = result.getError();
      if (error instanceof EmailAlreadyExistsError) {
        return new Response(JSON.stringify({ message: error.message }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }
}
