import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from '../../src/notifications/src/application/notifications.service';
import { INotificationsEmailSender } from '../../src/notifications/src/domain/notifications.email-sender';
import {
  INotificationsRepository,
  NotificationMessageEntity,
  NotificationMessageRecord,
} from '../../src/notifications/src/domain/notifications.repository';

type RepositoryMocks = {
  createMessage: ReturnType<typeof vi.fn>;
  updateMessageStatus: ReturnType<typeof vi.fn>;
  createDeliveryAttempt: ReturnType<typeof vi.fn>;
  getUserEmail: ReturnType<typeof vi.fn>;
  expireMessagesBefore: ReturnType<typeof vi.fn>;
};

const createMessageEntity = (
  id: number,
  record: NotificationMessageRecord
): NotificationMessageEntity => ({
  id,
  recipient_user_id: record.recipient_user_id,
  type: record.type,
  channel: record.channel,
  status: record.status,
  payload_json: record.payload_json,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  sent_at: null,
  expires_at: record.expires_at,
});

const createRepository = (): RepositoryMocks => {
  let nextId = 1;
  return {
    createMessage: vi
      .fn<INotificationsRepository['createMessage']>()
      .mockImplementation(async (record: NotificationMessageRecord) =>
        createMessageEntity(nextId++, record)
      ),
    updateMessageStatus: vi.fn<INotificationsRepository['updateMessageStatus']>().mockResolvedValue(undefined),
    createDeliveryAttempt: vi
      .fn<INotificationsRepository['createDeliveryAttempt']>()
      .mockResolvedValue(undefined),
    getUserEmail: vi.fn<INotificationsRepository['getUserEmail']>().mockResolvedValue('member@example.com'),
    expireMessagesBefore: vi.fn<INotificationsRepository['expireMessagesBefore']>().mockResolvedValue(3),
  };
};

describe('NotificationsService', () => {
  it('uses only in-app notifications when email config is missing', async () => {
    const repository = createRepository();
    const service = new NotificationsService(repository as unknown as INotificationsRepository);

    const result = await service.notifyNewProposition({
      recipientUserId: 12,
      propositionId: 44,
      rangeId: 1,
      rangeSlug: 'alpha',
      eventDate: '2024-01-10',
      startTime: '10:00',
      endTime: '11:00',
      firingLineId: 1,
      trackNos: [1, 2],
      requesterUserId: 2,
    });

    expect(result.isSuccess).toBe(true);
    expect(repository.createMessage).toHaveBeenCalledTimes(1);
    expect(repository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'in_app',
      })
    );
    expect(repository.getUserEmail).not.toHaveBeenCalled();
  });

  it('creates email notification when sender is configured', async () => {
    const repository = createRepository();
    const emailSender: INotificationsEmailSender = {
      providerName: 'test-email',
      send: vi.fn().mockResolvedValue(undefined),
    };
    const service = new NotificationsService(repository as unknown as INotificationsRepository, {
      emailFrom: 'noreply@example.com',
      emailSender,
    });

    const result = await service.notifyPropositionConverted({
      recipientUserId: 12,
      propositionId: 44,
      reservationId: 91,
      rangeId: 1,
      rangeSlug: 'alpha',
      eventDate: '2024-01-10',
      startTime: '10:00',
      endTime: '11:00',
      firingLineId: 1,
      trackNos: [1, 2],
      approvedByAdminId: 99,
      adminMessage: 'Approved',
    });

    expect(result.isSuccess).toBe(true);
    expect(repository.createMessage).toHaveBeenCalledTimes(2);
    expect(repository.createMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        channel: 'email',
      })
    );
    expect(repository.getUserEmail).toHaveBeenCalledWith(12);
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'member@example.com',
      })
    );
  });

  it('marks email as failed when recipient email is unavailable', async () => {
    const repository = createRepository();
    repository.getUserEmail.mockResolvedValueOnce(null);
    const emailSender: INotificationsEmailSender = {
      providerName: 'test-email',
      send: vi.fn().mockResolvedValue(undefined),
    };
    const service = new NotificationsService(repository as unknown as INotificationsRepository, {
      emailFrom: 'noreply@example.com',
      emailSender,
    });

    const result = await service.notifyNewProposition({
      recipientUserId: 12,
      propositionId: 44,
      rangeId: 1,
      rangeSlug: 'alpha',
      eventDate: '2024-01-10',
      startTime: '10:00',
      endTime: '11:00',
      firingLineId: 1,
      trackNos: [1, 2],
      requesterUserId: 2,
    });

    expect(result.isSuccess).toBe(true);
    expect(repository.updateMessageStatus).toHaveBeenCalledWith(2, 'failed', null);
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('expires messages using configured retention cleanup', async () => {
    const repository = createRepository();
    const service = new NotificationsService(repository as unknown as INotificationsRepository);

    const result = await service.cleanupExpiredNotifications('2024-02-01T00:00:00.000Z');

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe(3);
    expect(repository.expireMessagesBefore).toHaveBeenCalledWith('2024-02-01T00:00:00.000Z');
  });
});
