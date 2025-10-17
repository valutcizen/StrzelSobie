import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CancelPropositionCommand,
  ForbiddenError,
  IAuditService,
  IRangesService,
  PropositionAlreadyClosedError,
  PropositionNotFoundError,
  Result,
  UnauthorizedPropositionError,
  UserDto,
} from '@strzel-sobie/common';
import { ReservationsService } from '../../src/reservations/src/application/reservations.service';
import { IReservationsRepository, Proposition } from '../../src/reservations/src/domain/reservations.repository';

type RepositoryMocks = {
  getPropositionById: ReturnType<typeof vi.fn>;
  cancelProposition: ReturnType<typeof vi.fn>;
  getPropositions: ReturnType<typeof vi.fn>;
  getReservations: ReturnType<typeof vi.fn>;
  getOverlappingUsage: ReturnType<typeof vi.fn>;
  createProposition: ReturnType<typeof vi.fn>;
};

type AuditMocks = {
  logAction: ReturnType<typeof vi.fn>;
};

const createUser = (overrides: Partial<UserDto> = {}): UserDto => ({
  id: 1,
  email: 'user@example.com',
  isDeleted: 0,
  createdAt: '2024-01-01T00:00:00Z',
  roles: [],
  rangeRoles: {},
  ...overrides,
});

const createProposition = (overrides: Partial<Proposition> = {}): Proposition => ({
  id: 10,
  user_id: 1,
  range_id: 3,
  status: 'open',
  event_date: '2024-05-01',
  start_time: '10:00',
  end_time: '11:00',
  num_participants: 4,
  tracks: 2,
  ...overrides,
});

const createTestContext = () => {
  const repositoryMocks: RepositoryMocks = {
    getPropositionById: vi.fn(),
    cancelProposition: vi.fn(),
    getPropositions: vi.fn(),
    getReservations: vi.fn(),
    getOverlappingUsage: vi.fn(),
    createProposition: vi.fn(),
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

describe('ReservationsService.cancelProposition', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('cancels an open proposition owned by the requesting user', async () => {
    const { service, repositoryMocks, auditMocks } = createTestContext();
    const user = createUser();
    const proposition = createProposition();

    repositoryMocks.getPropositionById.mockResolvedValue(proposition);
    repositoryMocks.cancelProposition.mockResolvedValue({
      ...proposition,
      status: 'cancelled',
    });
    auditMocks.logAction.mockResolvedValue(Result.ok(undefined));

    const command: CancelPropositionCommand = { propositionId: proposition.id };
    const result = await service.cancelProposition(command, user);

    expect(result.isSuccess).toBe(true);
    expect(repositoryMocks.getPropositionById).toHaveBeenCalledWith(proposition.id);
    expect(repositoryMocks.cancelProposition).toHaveBeenCalledWith(proposition.id);
    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'PROPOSITION_CANCEL',
        target_id: proposition.id,
      })
    );
  });

  it('fails when the proposition does not exist', async () => {
    const { service, repositoryMocks } = createTestContext();
    const user = createUser();

    repositoryMocks.getPropositionById.mockResolvedValue(null);

    const result = await service.cancelProposition({ propositionId: 42 }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(PropositionNotFoundError);
    expect(repositoryMocks.cancelProposition).not.toHaveBeenCalled();
  });

  it('fails when the proposition belongs to a different user', async () => {
    const { service, repositoryMocks } = createTestContext();
    const user = createUser();
    const proposition = createProposition({ user_id: 99 });

    repositoryMocks.getPropositionById.mockResolvedValue(proposition);

    const result = await service.cancelProposition({ propositionId: proposition.id }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(UnauthorizedPropositionError);
    expect(repositoryMocks.cancelProposition).not.toHaveBeenCalled();
  });

  it('fails when the proposition is already closed', async () => {
    const { service, repositoryMocks } = createTestContext();
    const user = createUser();
    const proposition = createProposition({ status: 'cancelled' });

    repositoryMocks.getPropositionById.mockResolvedValue(proposition);

    const result = await service.cancelProposition({ propositionId: proposition.id }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(PropositionAlreadyClosedError);
    expect(repositoryMocks.cancelProposition).not.toHaveBeenCalled();
  });

  it('fails when the user is soft-deleted', async () => {
    const { service, repositoryMocks } = createTestContext();
    const deletedUser = createUser({ isDeleted: 1 });

    const result = await service.cancelProposition({ propositionId: 1 }, deletedUser);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(ForbiddenError);
    expect(repositoryMocks.getPropositionById).not.toHaveBeenCalled();
  });
});
