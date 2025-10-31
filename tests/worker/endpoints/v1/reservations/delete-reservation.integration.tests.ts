
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteReservation } from '../../../../../src/worker/src/endpoints/v1/reservations/delete-reservation';
import {
  ForbiddenError,
  IReservationsService,
  Result,
  ReservationNotFoundError,
  ReservationCancellationError,
} from '@strzel-sobie/common';

const reservationsServiceMock: IReservationsService = {
  cancelReservation: vi.fn(),
  createReservation: vi.fn(),
  getReservationDetails: vi.fn(),
  getReservations: vi.fn(),
};

const c: any = {
  get: vi.fn((key: string) => {
    if (key === 'reservationsService') {
      return reservationsServiceMock;
    }
    if (key === 'user') {
      return { id: 'user-1' };
    }
    return null;
  }),
  json: vi.fn((data: any, status: number) => ({ data, status })),
};

describe('DeleteReservation endpoint', () => {
  let endpoint: DeleteReservation;

  beforeEach(() => {
    endpoint = new DeleteReservation();
    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { reservationId: 1 },
    } as any);
    vi.clearAllMocks();
  });

  it('should return 204 on successful reservation cancellation', async () => {
    (reservationsServiceMock.cancelReservation as vi.Mock).mockResolvedValue(Result.ok(null));

    const response = await endpoint.handle(c);

    expect(reservationsServiceMock.cancelReservation).toHaveBeenCalledWith({ reservationId: 1 }, { id: 'user-1' });
    expect(response.status).toBe(204);
  });

  it('should return 403 if user is not allowed to cancel reservation', async () => {
    const error = new ForbiddenError('User is not allowed to cancel this reservation');
    (reservationsServiceMock.cancelReservation as vi.Mock).mockResolvedValue(Result.fail(error));

    const response = await endpoint.handle(c);

    expect(response.status).toBe(403);
    expect(response.data.message).toBe('User is not allowed to cancel this reservation');
  });

  it('should return 404 if reservation not found', async () => {
    const error = new ReservationNotFoundError();
    (reservationsServiceMock.cancelReservation as vi.Mock).mockResolvedValue(Result.fail(error));

    const response = await endpoint.handle(c);

    expect(response.status).toBe(404);
    expect(response.data.message).toBe('Reservation not found');
  });

  it('should return 500 on unexpected error', async () => {
    const error = new ReservationCancellationError();
    (reservationsServiceMock.cancelReservation as vi.Mock).mockResolvedValue(Result.fail(error as any));

    const response = await endpoint.handle(c);

    expect(response.status).toBe(500);
    expect(response.data.message).toBe('Failed to cancel reservation');
  });
});
