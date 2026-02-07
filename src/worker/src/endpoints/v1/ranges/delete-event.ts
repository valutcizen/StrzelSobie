import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { IEventsService } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapEventsError } from '../../../utils/events-error-mapper';

const ParamsSchema = z.object({
  rangeSlug: z.string().trim().min(1, 'rangeSlug is required'),
  eventSlug: z.string().trim().min(1, 'eventSlug is required'),
});

export class DeleteEvent extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Cancel event',
    description: 'Cancels (soft-deletes) an event for the selected range.',
    tags: ['Events'],
    request: {
      params: ParamsSchema,
    },
    responses: {
      '204': {
        description: 'Event cancelled successfully',
      },
      '401': {
        description: 'Unauthorized',
      },
      '403': {
        description: 'Forbidden',
      },
      '404': {
        description: 'Event not found',
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

    const result = await eventsService.cancelEvent(params.rangeSlug, params.eventSlug, user);

    if (result.isSuccess) {
      return new Response(null, { status: 204 });
    }

    const error = result.getError();
    const { status, body } = mapEventsError(error);

    if (status >= 500 && body.code === 'internal_error') {
      console.error('Error while cancelling event', error);
    }

    return c.json(body, status);
  }
}
