import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CancelReservationCommand,
  ForbiddenError,
  IAuditService,
  IRangesService,
  ReservationCancellationError,
  ReservationNotFoundError,
  Result,
  Role,
  UserDto,
  UserRole,
} from '@strzel-sobie/common';
import { ReservationsService } from '../../src/reservations/src/application/reservations.service';
import {
  IReservationsRepository,
  Reservation,
} from '../../src/reservations/src/domain/reservations.repository';

let roleIdCounter = 1;

type RepositoryMocks = {
  getReservationById: ReturnType<typeof vi.fn>;
  deleteReservation: ReturnType<typeof vi.fn>;
  getPropositionById: ReturnType<typeof vi.fn>;
  cancelProposition: ReturnType<typeof vi.fn>;
  getPropositions: ReturnType<typeof vi.fn>;
  getReservations: ReturnType<typeof vi.fn>;
  getOverlappingUsage: ReturnType<typeof vi.fn>;
  getOverlappingReservationsDetails: ReturnType<typeof vi.fn>;
  createProposition: ReturnType<typeof vi.fn>;
  createReservation: ReturnType<typeof vi.fn>;
  createReservationFromProposition: ReturnType<typeof vi.fn>;
  markPropositionConverted: ReturnType<typeof vi.fn>;
};

type AuditMocks = {
  logAction: ReturnType<typeof vi.fn>;
};

const createRole = (name: UserRole, scope: 'global' | 'range'): Role => ({
  id: roleIdCounter++,
  name,
  scope,
});

const createUser = (overrides: Partial<UserDto> = {}): UserDto => ({
  id: 1,
  email: 'user@example.com',
  isDeleted: 0,
  createdAt: '2024-01-01T00:00:00Z',
  roles: [],
  rangeRoles: {},
  ...overrides,
});

const createReservation = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 42,
  proposition_id: null,
  range_id: 7,
  coordinator_id: 1,
  event_date: '2024-05-10',
  start_time: '12:00',
  end_time: '13:00',
  num_participants: 5,
  tracks_requested: 2,
  is_public: false,
  is_joinable: false,
  ...overrides,
});

const createTestContext = () => {
  const repositoryMocks: RepositoryMocks = {
    getReservationById: vi.fn(),
    deleteReservation: vi.fn(),
    getPropositionById: vi.fn(),
    cancelProposition: vi.fn(),
    getPropositions: vi.fn(),
    getReservations: vi.fn(),
    getOverlappingUsage: vi.fn(),
    getOverlappingReservationsDetails: vi.fn(),
    createProposition: vi.fn(),
    createReservation: vi.fn(),
    createReservationFromProposition: vi.fn(),
    markPropositionConverted: vi.fn(),
  };

  const reservationsRepository = repositoryMocks as unknown as IReservationsRepository;

  const auditMocks: AuditMocks = {
    logAction: vi.fn(),
  };
  const auditService = auditMocks as unknown as IAuditService;

  const rangesService = {} as IRangesService;

  const service = new ReservationsService(rangesService, reservationsRepository, auditService);

  return { service, repositoryMocks, auditMocks };
};

describe('ReservationsService.cancelReservation', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('cancels a reservation for a global coordinator', async () => {
    const { service, repositoryMocks, auditMocks } = createTestContext();
    const reservation = createReservation();
    const user = createUser({
      roles: [createRole(UserRole.Coordinator, 'global')],
    });

    repositoryMocks.getReservationById.mockResolvedValue(reservation);
    repositoryMocks.deleteReservation.mockResolvedValue(reservation);
    auditMocks.logAction.mockResolvedValue(Result.ok(undefined));

    const command: CancelReservationCommand = { reservationId: reservation.id };
    const result = await service.cancelReservation(command, user);

    expect(result.isSuccess).toBe(true);
    expect(repositoryMocks.getReservationById).toHaveBeenCalledWith(reservation.id);
    expect(repositoryMocks.deleteReservation).toHaveBeenCalledWith(reservation.id);
    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'RESERVATION_CANCEL',
        target_id: reservation.id,
      })
    );
  });

  it('returns forbidden when the user is soft-deleted', async () => {
    const { service, repositoryMocks } = createTestContext();
    const deletedUser = createUser({ isDeleted: 1 });

    const result = await service.cancelReservation({ reservationId: 1 }, deletedUser);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(ForbiddenError);
    expect(repositoryMocks.getReservationById).not.toHaveBeenCalled();
  });

  it('fails when the reservation does not exist', async () => {
    const { service, repositoryMocks } = createTestContext();
    const user = createUser({
      roles: [createRole(UserRole.Coordinator, 'global')],
    });

    repositoryMocks.getReservationById.mockResolvedValue(null);

    const result = await service.cancelReservation({ reservationId: 999 }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(ReservationNotFoundError);
    expect(repositoryMocks.deleteReservation).not.toHaveBeenCalled();
  });

  it('fails when the user lacks cancellation privileges', async () => {
    const { service, repositoryMocks } = createTestContext();
    const reservation = createReservation({ coordinator_id: 55 });
    const user = createUser({ id: 1 });

    repositoryMocks.getReservationById.mockResolvedValue(reservation);

    const result = await service.cancelReservation({ reservationId: reservation.id }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(ForbiddenError);
    expect(repositoryMocks.deleteReservation).not.toHaveBeenCalled();
  });

  it('fails with ReservationNotFoundError when deletion returns null', async () => {
    const { service, repositoryMocks } = createTestContext();
    const reservation = createReservation();
    const user = createUser({
      roles: [createRole(UserRole.Coordinator, 'global')],
    });

    repositoryMocks.getReservationById.mockResolvedValue(reservation);
    repositoryMocks.deleteReservation.mockResolvedValue(null);

    const result = await service.cancelReservation({ reservationId: reservation.id }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(ReservationNotFoundError);
  });

  it('propagates audit failures as ReservationCancellationError', async () => {
    const { service, repositoryMocks, auditMocks } = createTestContext();
    const reservation = createReservation();
    const user = createUser({
      roles: [createRole(UserRole.Coordinator, 'global')],
    });

    repositoryMocks.getReservationById.mockResolvedValue(reservation);
    repositoryMocks.deleteReservation.mockResolvedValue(reservation);
    auditMocks.logAction.mockResolvedValue(Result.fail(new Error('Audit failure')));

    const result = await service.cancelReservation({ reservationId: reservation.id }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(ReservationCancellationError);
  });

  it('allows range coordinators to cancel their own reservations', async () => {
    const { service, repositoryMocks, auditMocks } = createTestContext();
    const reservation = createReservation({ coordinator_id: 5, range_id: 9 });
    const coordinatorRole = createRole(UserRole.Coordinator, 'range');
    const user = createUser({
      id: 5,
      rangeRoles: { '9': [coordinatorRole] },
    });

    repositoryMocks.getReservationById.mockResolvedValue(reservation);
    repositoryMocks.deleteReservation.mockResolvedValue(reservation);
    auditMocks.logAction.mockResolvedValue(Result.ok(undefined));

    const result = await service.cancelReservation({ reservationId: reservation.id }, user);

    expect(result.isSuccess).toBe(true);
  });

  it('allows range administrators to cancel any reservation in their range', async () => {
    const { service, repositoryMocks, auditMocks } = createTestContext();
    const reservation = createReservation({ coordinator_id: 99, range_id: 12 });
    const adminRole = createRole(UserRole.ShootingRangeAdministrator, 'range');
    const user = createUser({
      id: 2,
      rangeRoles: { '12': [adminRole] },
    });

    repositoryMocks.getReservationById.mockResolvedValue(reservation);
    repositoryMocks.deleteReservation.mockResolvedValue(reservation);
    auditMocks.logAction.mockResolvedValue(Result.ok(undefined));

    const result = await service.cancelReservation({ reservationId: reservation.id }, user);

    expect(result.isSuccess).toBe(true);
  });
});
