import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { UpdateEventSignupCommand, UserDto } from '@strzel-sobie/common';
import { IEventsService } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapEventsError } from '../../../utils/events-error-mapper';

const ParamsSchema = z.object({
  rangeSlug: z.string().trim().min(1, 'rangeSlug is required'),
  eventSlug: z.string().trim().min(1, 'eventSlug is required'),
});

const BodySchema = z
  .object({
    guests: z.number().int().min(0),
  })
  .strict();

export class UpdateEventSignup extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Update event signup',
    description: 'Updates the current user signup for an event.',
    tags: ['Events'],
    request: {
      params: ParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: BodySchema,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Signup updated successfully',
      },
      '400': {
        description: 'Signup validation failed',
      },
      '401': {
        description: 'Unauthorized',
      },
      '403': {
        description: 'Forbidden',
      },
      '404': {
        description: 'Signup not found',
      },
      '500': {
        description: 'Unexpected server error',
      },
    },
  };

  public async handle(c: AppContext) {
    const eventsService: IEventsService = c.get('eventsService');
    const user = c.get('user') as UserDto;
    const { params, body } = await this.getValidatedData<{
      params: z.infer<typeof ParamsSchema>;
      body: UpdateEventSignupCommand;
    }>();

    const result = await eventsService.updateSignup(
      params.rangeSlug,
      params.eventSlug,
      body,
      user
    );

    if (result.isSuccess) {
      return c.json(result.getValue(), 200);
    }

    const error = result.getError();
    const { status, body: errorBody } = mapEventsError(error);

    if (status >= 500 && errorBody.code === 'internal_error') {
      console.error('Error while updating event signup', error);
    }

    return c.json(errorBody, status);
  }
}
