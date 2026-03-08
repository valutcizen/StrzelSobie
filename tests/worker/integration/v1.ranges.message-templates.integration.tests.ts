import { describe, expect, it, vi } from 'vitest';
import { Result } from '@strzel-sobie/common/models';
import { GetMessageTemplates } from '../../../src/worker/src/endpoints/v1/ranges/get-message-templates';
import { CreateMessageTemplate } from '../../../src/worker/src/endpoints/v1/ranges/create-message-template';
import { UpdateMessageTemplate } from '../../../src/worker/src/endpoints/v1/ranges/update-message-template';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const adminUser = {
  id: 5,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  roles: [{ id: 1, name: 'Club/Community Administrator', scope: 'global' }],
  rangeRoles: {},
};

describe('Message templates endpoints', () => {
  it('GET /api/v1/ranges/:rangeSlug/message-templates returns templates', async () => {
    const reservationsService = {
      listMessageTemplates: vi.fn().mockResolvedValue(
        Result.ok([{ id: 7, rangeId: 2, createdByAdminId: 5, name: 'Default', content: 'Approved', isActive: true }])
      ),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/ranges/:rangeSlug/message-templates', GetMessageTemplates);
      },
      dependencies: { reservationsService, user: adminUser },
    });

    const response = await client.get('/api/v1/ranges/central/message-templates?includeInactive=true');
    expect(response.status).toBe(200);
    expect(reservationsService.listMessageTemplates).toHaveBeenCalledWith('central', true, adminUser);
  });

  it('POST /api/v1/ranges/:rangeSlug/message-templates creates template', async () => {
    const reservationsService = {
      createMessageTemplate: vi.fn().mockResolvedValue(
        Result.ok({ id: 9, rangeId: 2, createdByAdminId: 5, name: 'A', content: 'B', isActive: true })
      ),
    };
    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/message-templates', CreateMessageTemplate);
      },
      dependencies: { reservationsService, user: adminUser },
    });

    const response = await client.post('/api/v1/ranges/central/message-templates', {
      json: { name: 'A', content: 'B' },
    });
    expect(response.status).toBe(201);
    expect(reservationsService.createMessageTemplate).toHaveBeenCalledWith(
      'central',
      { name: 'A', content: 'B' },
      adminUser
    );
  });

  it('PATCH /api/v1/message-templates/:templateId updates template', async () => {
    const reservationsService = {
      updateMessageTemplate: vi.fn().mockResolvedValue(
        Result.ok({ id: 9, rangeId: 2, createdByAdminId: 5, name: 'A2', content: 'B', isActive: true })
      ),
    };
    const { client } = createWorkerTestClient({
      register: (router) => {
        router.patch('/api/v1/message-templates/:templateId', UpdateMessageTemplate);
      },
      dependencies: { reservationsService, user: adminUser },
    });

    const response = await client.patch('/api/v1/message-templates/9', {
      json: { name: 'A2' },
    });
    expect(response.status).toBe(200);
    expect(reservationsService.updateMessageTemplate).toHaveBeenCalledWith(
      9,
      { name: 'A2', content: undefined, isActive: undefined },
      adminUser
    );
  });
});

