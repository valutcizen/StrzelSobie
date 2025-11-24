import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CreateRangeCommand, UserDto } from '@strzel-sobie/common';
import { UserRole } from '@strzel-sobie/common/models';
import { createTestDatabase, TestDatabase } from '../utils/database';
import { RangesService } from '../../src/ranges/src/application/ranges.service';
import { RangesDbRepository } from '../../src/ranges/src/infrastructure/ranges.db.repository';
import { AuditDbRepository } from '../../src/audit/src/infrastructure/audit.db.repository';
import { AuditService } from '../../src/audit/src/application/audit.service';

describe('RangesService integration', () => {
  let dbHandle: TestDatabase;
  let rangesService: RangesService;

  const adminUser: UserDto = {
    id: 'user-1',
    email: 'admin@strzel-sobie.pl',
    roles: [{ id: '1', name: UserRole.ClubCommunityAdministrator, scope: 'global' }],
    rangeRoles: {},
  };

  beforeEach(async () => {
    dbHandle = await createTestDatabase();

    const rangesRepository = new RangesDbRepository(dbHandle.db);
    const auditRepository = new AuditDbRepository(dbHandle.db);
    const auditService = new AuditService(auditRepository);
    rangesService = new RangesService(rangesRepository, auditService);
  });

  afterEach(() => {
    dbHandle.cleanup();
  });

  it('should create a new shooting range with minimal data', async () => {
    // Arrange
    const command: CreateRangeCommand = {
      slug: 'test-range',
      displayName: 'Test Range',
    };

    // Act
    const result = await rangesService.createRange(command, adminUser);

    // Assert
    expect(result.isSuccess).toBe(true);
    const range = result.getValue();
    expect(range).toBeDefined();
    expect(range.slug).toBe('test-range');
    expect(range.displayName).toBe('Test Range');
    expect(range.totalTracks).toBe(0); // Should default to 0
  });

  it('should fail to create a range if user is not a global admin', async () => {
    // Arrange
    const command: CreateRangeCommand = {
      slug: 'test-range-2',
      displayName: 'Test Range 2',
    };
    const memberUser: UserDto = {
        id: 'user-2',
        email: 'member@strzel-sobie.pl',
        roles: [{ id: '2', name: UserRole.Member, scope: 'global' }],
        rangeRoles: {},
      };

    // Act
    const result = await rangesService.createRange(command, memberUser);

    // Assert
    expect(result.isSuccess).toBe(false);
    expect(result.getError().message).toContain('User is not allowed to create ranges');
  });

  it('should fail to create a range if slug already exists', async () => {
    // Arrange
    const command: CreateRangeCommand = {
      slug: 'duplicate-range',
      displayName: 'Duplicate Range',
    };
    await rangesService.createRange(command, adminUser);

    // Act
    const result = await rangesService.createRange(command, adminUser);

    // Assert
    expect(result.isSuccess).toBe(false);
    expect(result.getError().message).toContain('already exists');
  });
});
