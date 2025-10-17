import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { Context } from '../../../types';
import { AuthService } from '@strzel-sobie/auth';
import { EmailAlreadyExistsError } from '@strzel-sobie/common';

// Schemas
const RegisterUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const RegisteredUserResponseSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  roles: z.array(z.string()),
});

// Routes
export class Register extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
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

  async handle(c: Context) {
    const data = await this.getValidatedData<typeof RegisterUserRequestSchema>();
    const authService: AuthService = c.get('authService');

    const sourceIp = c.req.header('cf-connecting-ip') || 'unknown';
    const proxiedIp = c.req.header('x-forwarded-for') || 'unknown';

    const result = await authService.register(data, sourceIp, proxiedIp);

    if (result.isSuccess) {
      c.status(201);
      return result.getValue();
    } else {
      const error = result.getError();
      if (error instanceof EmailAlreadyExistsError) {
        c.status(409);
        return { message: error.message };
      } else {
        c.status(500);
        return { message: 'Internal Server Error' };
      }
    }
  }
}
