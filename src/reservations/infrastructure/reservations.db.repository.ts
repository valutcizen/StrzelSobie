import { Result } from '@strzel-sobie/common';
import { IReservationsRepository, Proposition, Reservation } from '../domain/reservations.repository';

export class ReservationsDbRepository implements IReservationsRepository {
  public async getPropositions(rangeId: string, startDate: string, endDate: string): Promise<Result<Proposition[], Error>> {
    // This is a placeholder implementation.
    // In a real scenario, this would query the database.
    const mockPropositions: Proposition[] = [
      {
        id: 1,
        user_id: 2,
        range_id: parseInt(rangeId),
        event_date: '2025-10-15',
        start_time: '14:00',
        end_time: '15:00',
        tracks: 2,
      },
    ];
    return Result.ok(mockPropositions.filter(p => p.range_id === parseInt(rangeId)));
  }

  public async getReservations(rangeId: string, startDate: string, endDate: string): Promise<Result<Reservation[], Error>> {
    // This is a placeholder implementation.
    // In a real scenario, this would query the database.
    const mockReservations: Reservation[] = [
      {
        id: 1,
        range_id: parseInt(rangeId),
        coordinator_id: 5,
        event_date: '2025-10-16',
        start_time: '10:00',
        end_time: '12:00',
        tracks: 5,
        is_public: true,
        is_joinable: false,
        participants_count: 10,
      },
    ];
    return Result.ok(mockReservations.filter(r => r.range_id === parseInt(rangeId)));
  }
}
