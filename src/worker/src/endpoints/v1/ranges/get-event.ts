import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { IEventsService } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapEventsError } from '../../../utils/events-error-mapper';
import { resolveOptionalUser } from '../../../utils/resolve-optional-user';

const ParamsSchema = z.object({
  rangeSlug: z.string().trim().min(1, 'rangeSlug is required'),
  eventSlug: z.string().trim().min(1, 'eventSlug is required'),
});

export class GetEvent extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Get event details',
    description: 'Retrieves full details for a specific event.',
    tags: ['Events'],
    request: {
      params: ParamsSchema,
    },
    responses: {
      '200': {
        description: 'Event details returned successfully',
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

    const user = c.get('user') ?? (await resolveOptionalUser(c));
    const result = await eventsService.getEventDetails(params.rangeSlug, params.eventSlug, user);

    if (result.isSuccess) {
      return c.json(result.getValue());
    }

    const error = result.getError();
    const { status, body } = mapEventsError(error);

    if (status >= 500 && body.code === 'internal_error') {
      console.error('Error while fetching event details', error);
    }

    return c.json(body, status);
  }
}
