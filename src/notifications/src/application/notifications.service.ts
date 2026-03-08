import {
  INotificationsService,
  NotificationType,
  NotifyNewPropositionCommand,
  NotifyPropositionConvertedCommand,
  NotifyReservationCancelledCommand,
  Result,
} from '@strzel-sobie/common/models';
import { INotificationsEmailSender } from '../domain/notifications.email-sender';
import { INotificationsRepository } from '../domain/notifications.repository';

type NotificationsServiceOptions = {
  retentionDays?: number;
  emailFrom?: string;
  emailSender?: INotificationsEmailSender;
};

const DEFAULT_RETENTION_DAYS = 28;

export class NotificationsService implements INotificationsService {
  private readonly retentionDays: number;
  private readonly emailFrom: string | null;
  private readonly emailSender: INotificationsEmailSender | null;

  constructor(
    private readonly repository: INotificationsRepository,
    options: NotificationsServiceOptions = {}
  ) {
    this.retentionDays =
      Number.isInteger(options.retentionDays) && (options.retentionDays ?? 0) > 0
        ? (options.retentionDays as number)
        : DEFAULT_RETENTION_DAYS;
    this.emailFrom = options.emailFrom?.trim() ? options.emailFrom.trim() : null;
    this.emailSender = options.emailSender ?? null;
  }

  public async notifyNewProposition(command: NotifyNewPropositionCommand): Promise<Result<void>> {
    const payload = {
      propositionId: command.propositionId,
      rangeId: command.rangeId,
      rangeSlug: command.rangeSlug,
      requesterUserId: command.requesterUserId,
      eventDate: command.eventDate,
      startTime: command.startTime,
      endTime: command.endTime,
      firingLineId: command.firingLineId,
      trackNos: command.trackNos,
    };

    return this.dispatchNotification({
      recipientUserId: command.recipientUserId,
      type: 'proposition_created_for_admin',
      payload,
      email: {
        subject: `New proposition on ${command.rangeSlug} (${command.eventDate} ${command.startTime}-${command.endTime})`,
        body: `A member created proposition #${command.propositionId}.`,
      },
    });
  }

  public async notifyPropositionConverted(
    command: NotifyPropositionConvertedCommand
  ): Promise<Result<void>> {
    const payload = {
      propositionId: command.propositionId,
      reservationId: command.reservationId,
      rangeId: command.rangeId,
      rangeSlug: command.rangeSlug,
      approvedByAdminId: command.approvedByAdminId,
      eventDate: command.eventDate,
      startTime: command.startTime,
      endTime: command.endTime,
      firingLineId: command.firingLineId,
      trackNos: command.trackNos,
      adminMessage: command.adminMessage,
    };

    return this.dispatchNotification({
      recipientUserId: command.recipientUserId,
      type: 'proposition_converted_for_member',
      payload,
      email: {
        subject: `Your proposition #${command.propositionId} was converted`,
        body: command.adminMessage,
      },
    });
  }

  public async notifyReservationCancelled(
    command: NotifyReservationCancelledCommand
  ): Promise<Result<void>> {
    const payload = {
      reservationId: command.reservationId,
      rangeId: command.rangeId,
      rangeSlug: command.rangeSlug,
      eventDate: command.eventDate,
      startTime: command.startTime,
      endTime: command.endTime,
      firingLineId: command.firingLineId,
      trackNos: command.trackNos,
      cancelledByUserId: command.cancelledByUserId,
    };

    return this.dispatchNotification({
      recipientUserId: command.recipientUserId,
      type: 'reservation_cancelled',
      payload,
      email: {
        subject: `Reservation #${command.reservationId} was cancelled`,
        body: `Reservation #${command.reservationId} has been cancelled.`,
      },
    });
  }

  public async cleanupExpiredNotifications(nowIso?: string): Promise<Result<number>> {
    try {
      const now = nowIso ? new Date(nowIso) : new Date();
      const expiredCount = await this.repository.expireMessagesBefore(now.toISOString());
      return Result.ok(expiredCount);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  private async dispatchNotification(command: {
    recipientUserId: number;
    type: NotificationType;
    payload: Record<string, unknown>;
    email: { subject: string; body: string };
  }): Promise<Result<void>> {
    const expiresAt = this.calculateExpiresAt();
    const payloadJson = JSON.stringify(command.payload);

    try {
      const inAppMessage = await this.repository.createMessage({
        recipient_user_id: command.recipientUserId,
        type: command.type,
        channel: 'in_app',
        status: 'queued',
        payload_json: payloadJson,
        expires_at: expiresAt,
      });
      await this.markSent(inAppMessage.id, 'in_app');

      if (!this.isEmailConfigured()) {
        return Result.ok(undefined);
      }

      const emailMessage = await this.repository.createMessage({
        recipient_user_id: command.recipientUserId,
        type: command.type,
        channel: 'email',
        status: 'queued',
        payload_json: payloadJson,
        expires_at: expiresAt,
      });

      const recipientEmail = await this.repository.getUserEmail(command.recipientUserId);
      if (!recipientEmail) {
        await this.markFailed(emailMessage.id, this.emailSender?.providerName ?? 'email', 'Recipient email is missing');
        return Result.ok(undefined);
      }

      try {
        await this.emailSender!.send({
          from: this.emailFrom!,
          to: recipientEmail,
          subject: command.email.subject,
          body: command.email.body,
        });
        await this.markSent(emailMessage.id, this.emailSender!.providerName);
      } catch (error) {
        await this.markFailed(
          emailMessage.id,
          this.emailSender!.providerName,
          error instanceof Error ? error.message : 'Unknown email error'
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  private calculateExpiresAt(): string {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + this.retentionDays);
    return expiration.toISOString();
  }

  private isEmailConfigured(): boolean {
    return this.emailSender !== null && this.emailFrom !== null;
  }

  private async markSent(messageId: number, provider: string): Promise<void> {
    const now = new Date().toISOString();
    await this.repository.updateMessageStatus(messageId, 'sent', now);
    await this.repository.createDeliveryAttempt({
      message_id: messageId,
      provider,
      status: 'sent',
      error: null,
    });
  }

  private async markFailed(messageId: number, provider: string, error: string): Promise<void> {
    await this.repository.updateMessageStatus(messageId, 'failed', null);
    await this.repository.createDeliveryAttempt({
      message_id: messageId,
      provider,
      status: 'failed',
      error,
    });
  }
}
