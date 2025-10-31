import { describe, it, expect, vi, type Mocked } from 'vitest';
import {
  Result,
  CreateRangeDto,
  UpdateRangeDto,
  RangeDto,
  IRangesRepository,
  IAuditService,
  User,
  Role,
  UpdateRangeCommand,
  UserDto,
  UserRole,
} from '@strzel-sobie/common/models';
import { RangesService } from '@strzel-sobie/ranges/src/application/ranges.service';
import type { IRangesRepository } from '@strzel-sobie/ranges/src/domain/ranges.repository';
import type { ShootingRange } from '@strzel-sobie/ranges/src/domain/shooting-range.model';

describe('RangesService ↔ Audit module integration', () => {
  it('persists updates and emits an audit log entry', async () => {
    const ctx = createRangesServiceContext();
    const storedRange: ShootingRange = {
      id: 3,
      slug: 'downtown',
      displayName: 'Downtown Range',
      totalTracks: 5,
      operatingHours: JSON.stringify({ monday: { open: '09:00', close: '17:00' } }),
    };
    const command: UpdateRangeCommand = {
      totalTracks: 7,
      operatingHours: { monday: { open: '08:00', close: '18:00' } },
    };
    const admin: UserDto = {
      id: 1,
      email: 'lead@example.com',
      isDeleted: 0,
      createdAt: '2024-03-10T10:00:00.000Z',
      roles: [{ id: 10, name: UserRole.ClubCommunityAdministrator, scope: 'global' }],
      rangeRoles: {},
    };

    ctx.rangesRepository.findBySlug.mockResolvedValue(storedRange);
    ctx.auditService.logAction.mockResolvedValue(Result.ok(undefined));

    const result = await ctx.service.updateRangeDetails(storedRange.slug, command, admin);

    expect(result.isSuccess).toBe(true);
    expect(ctx.rangesRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: storedRange.id,
        totalTracks: command.totalTracks,
        operatingHours: JSON.stringify(command.operatingHours),
      })
    );
    expect(ctx.auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'RANGE_UPDATE',
        target_id: storedRange.id,
        details: expect.objectContaining({
          user: admin,
          command,
        }),
      })
    );
  });
});

function createRangesServiceContext(): {
  rangesRepository: Mocked<IRangesRepository>;
  auditService: Mocked<IAuditService>;
  service: RangesService;
} {
  const rangesRepository: Mocked<IRangesRepository> = {
    findAll: vi.fn(),
    findBySlug: vi.fn(),
    update: vi.fn(),
    getRangeIdBySlug: vi.fn(),
    existsRangeById: vi.fn(),
  };

  const auditService: Mocked<IAuditService> = {
    logAction: vi.fn(),
  };

  const service = new RangesService(rangesRepository, auditService);

  return { rangesRepository, auditService, service };
}
