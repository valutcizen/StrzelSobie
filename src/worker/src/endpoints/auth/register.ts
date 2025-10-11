import { OpenAPIRoute, Str, Num } from 'chanfana';
import { z } from 'zod';
import { AppContext } from '../../types';

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
    // The actual implementation will be done later, as per the plan.
    // This is just for generating OpenAPI docs.
    const data = await this.getValidatedData<typeof this.schema>();

    return new Response(
      JSON.stringify({
        id: 1,
        email: data.body.email,
        roles: ['Guest'],
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
