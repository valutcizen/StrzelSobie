import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { IReservationsService } from '@strzel-sobie/common';
import { AppContext } from '../../../types';
import { mapReservationsError } from '../../../utils/reservations-error-mapper';

const ParamsSchema = z.object({
  rangeSlug: z.string(),
});

const QuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // YYYY-MM-DD
});

export class GetEvents extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    summary: 'Get Calendar Events for a Range',
    description: 'Retrieves all calendar events (propositions and reservations) for a specific shooting range within a given date range.',
    tags: ['Ranges'],
    request: {
      params: ParamsSchema,
      query: QuerySchema,
    },
    responses: {
      '200': {
        description: 'Returns the calendar events for the range',
        content: {
          'application/json': {
            schema: z.any(), // Placeholder for CalendarEventsDto
          },
        },
      },
      '400': {
        description: 'Bad Request',
      },
      '404': {
        description: 'Range not found',
      },
    },
  };

  public async handle(c: AppContext) {
    const reservationsService: IReservationsService = c.get('reservationsService');
    const { params, query } = await this.getValidatedData<{params: z.infer<typeof ParamsSchema>, query: z.infer<typeof QuerySchema>}>();
    const user = c.get('user');

    const result = await reservationsService.getCalendarEvents({
      rangeSlug: params.rangeSlug,
      startDate: query.startDate,
      endDate: query.endDate,
      user: {
        id: user.id.toString(),
        roles: user.roles.map((role) => role.name),
        range_roles: Object.entries(user.rangeRoles ?? {}).reduce(
          (acc, [rangeId, roles]) => {
            acc[rangeId] = roles.map((role) => role.name);
            return acc;
          },
          {} as Record<string, string[]>
        ),
      },
    });

    if (result.isSuccess) {
      return c.json(result.getValue());
    }

    const error = result.getError();
    const { status, body } = mapReservationsError(error);

    if (status === 500) {
      console.error('Unexpected error while fetching range events', error);
    }

    return c.json(body, status);
  }
}
