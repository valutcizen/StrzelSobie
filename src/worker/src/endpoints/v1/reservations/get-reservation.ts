import { OpenAPIRoute, OpenAPIRouteSchema } from 'chanfana';
import { z } from 'zod';
import { IReservationsService, ReservationDetailDto } from '@strzel-sobie/common';
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

export class GetReservationDetail extends OpenAPIRoute {
  public schema: OpenAPIRouteSchema = {
    summary: 'Get reservation details',
    description: 'Returns detailed information for a reservation visible to the current user.',
    tags: ['Reservations'],
    request: {
      params: ParamsSchema,
    },
    responses: {
      '200': {
        description: 'Reservation details',
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
      '403': {
        description: 'User is not allowed to view this reservation',
      },
      '404': {
        description: 'Reservation not found',
      },
    },
  };

  public async handle(c: AppContext) {
    const reservationsService: IReservationsService = c.get('reservationsService');
    const user = c.get('user');

    const { params } = await this.getValidatedData<{
      params: { reservationId: number };
    }>();

    const result = await reservationsService.getReservationDetails(params.reservationId, user);

    if (result.isSuccess) {
      const detail = result.getValue() as ReservationDetailDto;
      return c.json(detail, 200);
    }

    const error = result.getError();
    const { status, body } = mapReservationsError(error);

    return c.json(body, status);
  }
}
