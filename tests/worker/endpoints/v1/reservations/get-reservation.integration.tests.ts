
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetReservationDetail } from '../../../../../src/worker/src/endpoints/v1/reservations/get-reservation';
import {
  Result,
  ReservationNotFoundError,
  ReservationDetailDto,
  ForbiddenError,
  IReservationsService,
} from '@strzel-sobie/common/models';

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

describe('GetReservationDetail endpoint', () => {
  let endpoint: GetReservationDetail;

  beforeEach(() => {
    endpoint = new GetReservationDetail();
    vi.spyOn(endpoint, 'getValidatedData').mockResolvedValue({
      params: { reservationId: 1 },
    } as any);
    vi.clearAllMocks();
  });

  it('should return 200 with reservation details on success', async () => {
    const reservationDetail: ReservationDetailDto = {
      id: 1,
      rangeId: 5,
      coordinatorId: 12,
      propositionId: null,
      proposition: null,
      eventDate: '2024-06-01',
      startTime: '10:00',
      endTime: '11:00',
      tracksRequested: 2,
      createdAt: '2024-05-01T10:00:00Z',
      coordinator: {
        id: 12,
        email: 'coordinator@example.com',
        phoneNumber: null,
      },
    };
    (reservationsServiceMock.getReservationDetails as vi.Mock).mockResolvedValue(Result.ok(reservationDetail));

    const response = await endpoint.handle(c);

    expect(reservationsServiceMock.getReservationDetails).toHaveBeenCalledWith(1, { id: 'user-1' });
    expect(response.status).toBe(200);
    expect(response.data).toEqual(reservationDetail);
  });

  it('should return 403 if user is not allowed to view this reservation', async () => {
    const error = new ForbiddenError('User is not allowed to view this reservation');
    (reservationsServiceMock.getReservationDetails as vi.Mock).mockResolvedValue(Result.fail(error));

    const response = await endpoint.handle(c);

    expect(response.status).toBe(403);
    expect(response.data.message).toBe('User is not allowed to view this reservation');
  });

  it('should return 404 if reservation not found', async () => {
    const error = new ReservationNotFoundError();
    (reservationsServiceMock.getReservationDetails as vi.Mock).mockResolvedValue(Result.fail(error));

    const response = await endpoint.handle(c);

    expect(response.status).toBe(404);
    expect(response.data.message).toBe('Reservation not found');
  });
});
