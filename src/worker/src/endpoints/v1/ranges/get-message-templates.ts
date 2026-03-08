import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { IReservationsService } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapReservationsError } from '../../../utils/reservations-error-mapper';

const ParamsSchema = z.object({
  rangeSlug: z.string().trim().min(1, 'rangeSlug is required'),
});

const QuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).optional(),
});

export class GetMessageTemplates extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'List message templates for a range',
    tags: ['Reservations'],
    request: {
      params: ParamsSchema,
      query: QuerySchema,
    },
    responses: {
      '200': { description: 'Templates list' },
      '403': { description: 'Forbidden' },
      '404': { description: 'Range not found' },
    },
  };

  public async handle(c: AppContext) {
    const reservationsService: IReservationsService = c.get('reservationsService');
    const user = c.get('user');
    const {
      params,
      query,
    } = await this.getValidatedData<{ params: z.infer<typeof ParamsSchema>; query: z.infer<typeof QuerySchema> }>();

    const includeInactive = (query.includeInactive ?? 'false') === 'true';
    const result = await reservationsService.listMessageTemplates(
      params.rangeSlug,
      includeInactive,
      user
    );

    if (result.isSuccess) {
      return c.json(result.getValue(), 200);
    }

    const { status, body } = mapReservationsError(result.getError());
    return c.json(body, status);
  }
}

