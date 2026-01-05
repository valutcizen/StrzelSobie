import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { IEventsService } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapEventsError } from '../../../utils/events-error-mapper';

const ParamsSchema = z.object({
  rangeSlug: z.string().trim().min(1, 'rangeSlug is required'),
  eventSlug: z.string().trim().min(1, 'eventSlug is required'),
});

export class DeleteEventSignup extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Cancel event signup',
    description: 'Cancels the current user signup for the selected event.',
    tags: ['Events'],
    request: {
      params: ParamsSchema,
    },
    responses: {
      '204': {
        description: 'Signup cancelled successfully',
      },
      '401': {
        description: 'Unauthorized',
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
    const { params } = await this.getValidatedData<{
      params: z.infer<typeof ParamsSchema>;
    }>();
    const user = c.get('user');

    const result = await eventsService.cancelSignup(params.rangeSlug, params.eventSlug, user);

    if (result.isSuccess) {
      return new Response(null, { status: 204 });
    }

    const error = result.getError();
    const { status, body } = mapEventsError(error);

    if (status >= 500 && body.code === 'internal_error') {
      console.error('Error while cancelling event signup', error);
    }

    return c.json(body, status);
  }
}
