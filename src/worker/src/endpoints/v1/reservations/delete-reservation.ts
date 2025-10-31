import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { CancelReservationCommand } from '@strzel-sobie/common';
import { IReservationsService } from '@strzel-sobie/common/models';
import { AppContext } from '../../../types';
import { mapReservationsError } from '../../../utils/reservations-error-mapper';

const ParamsSchema = z.object({
  reservationId: z
    .string()
    .trim()
    .min(1, 'reservationId is required')
    .regex(/^\d+$/, 'reservationId must be a numeric identifier')
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => value > 0, 'reservationId must be greater than zero'),
});

export class DeleteReservation extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Cancel reservation',
    description:
      'Allows coordinators and shooting range administrators to cancel an existing reservation.',
    tags: ['Reservations'],
    request: {
      params: ParamsSchema,
    },
    responses: {
      '204': {
        description: 'Reservation cancelled successfully',
      },
      '400': {
        description: 'Invalid identifier format or business rule violation',
      },
      '403': {
        description: 'User is not allowed to cancel this reservation',
      },
      '404': {
        description: 'Reservation not found',
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
      params: { reservationId: number };
    }>();

    const command: CancelReservationCommand = {
      reservationId: params.reservationId,
    };

    const result = await reservationsService.cancelReservation(command, user);

    if (result.isSuccess) {
      return new Response(null, { status: 204 });
    }

    const error = result.getError();
    const { status, body } = mapReservationsError(error);

    if (status >= 500 && body.code === 'internal_error') {
      console.error('Error during reservation cancellation', error);
    }

    return c.json(body, status);
  }
}
