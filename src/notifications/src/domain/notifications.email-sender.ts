export type SendEmailCommand = {
  from: string;
  to: string;
  subject: string;
  body: string;
};

export interface INotificationsEmailSender {
  readonly providerName: string;
  send(command: SendEmailCommand): Promise<void>;
}

export class ConsoleNotificationsEmailSender implements INotificationsEmailSender {
  public readonly providerName = 'console';

  public async send(command: SendEmailCommand): Promise<void> {
    console.info('[notifications:email]', {
      provider: this.providerName,
      from: command.from,
      to: command.to,
      subject: command.subject,
    });
  }
}
