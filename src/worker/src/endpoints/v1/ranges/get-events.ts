import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { IReservationsService, UserDto } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapReservationsError } from '../../../utils/reservations-error-mapper';
import { resolveOptionalUser } from '../../../utils/resolve-optional-user';

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
    description: 'Retrieves all calendar events (propositions, reservations, and events) for a specific shooting range within a given date range.',
    tags: ['Reservations'],
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
    const { rangeSlug } = params as unknown as { rangeSlug: string };
    const { startDate, endDate } = query as unknown as { startDate: string; endDate: string };
    
    const user = c.get('user') ?? (await resolveOptionalUser(c));
    const userPayload = this.normalizeUser(user);
    const result = await reservationsService.getCalendarEvents({
      rangeSlug,
      startDate,
      endDate,
      user: userPayload,
    });

    if (result.isSuccess) {
      return c.json(result.getValue());
    }

    const error = result.getError();
    console.error('Error while fetching range events', error);
    const { status, body } = mapReservationsError(error);
    return c.json(body, status);
  }

  private normalizeUser(user: UserDto) {
    const roles = (user.roles ?? [])
      .map((role) => role?.name ?? '')
      .filter((roleName) => roleName.length > 0);

    const rangeRolesSource =
      (user as { rangeRoles?: Record<string, unknown> }).rangeRoles ??
      (user as { range_roles?: Record<string, unknown> }).range_roles ??
      {};

    const rangeRoles = Object.entries(rangeRolesSource as Record<string, Array<{ name?: string } | string> | undefined>).reduce((acc, [rangeId, roleList]) => {
      const roleNames = (roleList ?? [])
        .map((role) => (typeof role === 'string' ? role : role?.name ?? ''))
        .filter((name) => name.length > 0);

      if (roleNames.length > 0) {
        acc[rangeId] = roleNames;
      }

      return acc;
    }, {} as Record<string, string[]>);

    return {
      id: user.id.toString(),
      roles,
      range_roles: rangeRoles,
    };
  }
}
