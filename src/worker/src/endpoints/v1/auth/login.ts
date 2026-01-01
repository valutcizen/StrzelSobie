import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { Context } from '../../../types';
import { setCookie } from 'hono/cookie';
import { IAuthService } from '@strzel-sobie/common/models';
import { LoginUserDto } from '@strzel-sobie/common';

// Schemas
export const LoginUserDtoSchema = z.object({
  email: z.string().email({ message: 'Invalid email format.' }),
  password: z.string().min(1, { message: 'Password cannot be empty.' }),
});

// Routes
export class Login extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'User Login',
    description: 'Authenticates a user and returns a session token.',
    tags: ['Auth'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: LoginUserDtoSchema,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string(),
            }),
          },
        },
      },
      '400': {
        description: 'Invalid request format',
      },
      '401': {
        description: 'Invalid email or password',
      },
    },
  };

  async handle(c: Context) {
    const body = await c.req.json();
    const validationResult = LoginUserDtoSchema.safeParse(body);

    if (!validationResult.success) {
      console.error(validationResult.error);
      return c.json({ message: 'Invalid request body' }, 400);
    }

    const data = validationResult.data as LoginUserDto;
    const authService: IAuthService = c.get('authService');

    const result = await authService.login(data);

    if (result.isSuccess) {
      const { token, session } = result.getValue();
      setCookie(c, 'session_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 3600, // 1 hour
      });

      return c.json({
        message: 'Login successful.',
        roles: session.roles,
        rangeRoles: session.rangeRoles,
      });
    } else {
      console.error(result.getError());
      return c.json(
        {
          message: result.getError().message,
        },
        401,
      );
    }
  }
}
