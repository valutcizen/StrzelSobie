import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import {
  CancelPropositionCommand,
  IReservationsService,
} from '@strzel-sobie/common';
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

export class DeleteProposition extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Cancel proposition',
    description: 'Allows the proposition owner to cancel an open proposition.',
    tags: ['Reservations'],
    request: {
      params: ParamsSchema,
    },
    responses: {
      '204': {
        description: 'Proposition cancelled successfully',
      },
      '400': {
        description: 'Invalid identifier format or proposition already closed',
      },
      '403': {
        description: 'User is not allowed to cancel this proposition',
      },
      '404': {
        description: 'Proposition not found',
      },
      '500': {
        description: 'Unexpected server error',
      },
    },
  };

  public async handle(c: AppContext) {
    const reservationsService: IReservationsService = c.get('reservationsService');
    const user = c.get('user');

    const { params } = await this.getValidatedData<{
      params: { propositionId: number };
    }>();

    const command: CancelPropositionCommand = {
      propositionId: params.propositionId,
    };

    const result = await reservationsService.cancelProposition(command, user);

    if (result.isSuccess) {
      return new Response(null, { status: 204 });
    }

    const error = result.getError();
    console.error('Error during proposition cancellation', error);
    const { status, body } = mapReservationsError(error);
    return c.json(body, status);
  }
}
