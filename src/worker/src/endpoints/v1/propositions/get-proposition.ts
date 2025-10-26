import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { IReservationsService, PropositionDetailDto } from '@strzel-sobie/common';
import { AppContext } from '../../../types';
import { mapReservationsError } from '../../../utils/reservations-error-mapper';

const ParamsSchema = z.object({
  propositionId: z
    .string()
    .trim()
    .min(1, 'propositionId is required')
    .regex(/^\d+$/, 'propositionId must be a numeric identifier')
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => value > 0, 'propositionId must be greater than zero'),
});

export class GetPropositionDetail extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Get proposition details',
    description: 'Returns detailed information for a proposition visible to the current user.',
    tags: ['Reservations'],
    request: {
      params: ParamsSchema,
    },
    responses: {
      '200': {
        description: 'Proposition details',
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
      '403': {
        description: 'User is not allowed to view this proposition',
      },
      '404': {
        description: 'Proposition not found',
      },
    },
  };

  public async handle(c: AppContext) {
    const reservationsService: IReservationsService = c.get('reservationsService');
    const user = c.get('user');

    const { params } = await this.getValidatedData<{
      params: { propositionId: number };
    }>();

    const result = await reservationsService.getPropositionDetails(params.propositionId, user);

    if (result.isSuccess) {
      const detail = result.getValue() as PropositionDetailDto;
      return c.json(detail, 200);
    }

    const error = result.getError();
    const { status, body } = mapReservationsError(error);

    return c.json(body, status);
  }
}
