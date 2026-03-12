import { ApplicationEvent } from 'src/core/application/application-event.base';

/**
 * Fired after an email address is verified.
 * Used for side effects: update user preferences, grant feature access, send confirmation, etc.
 */
export interface EmailVerifiedEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly verifiedAt: Date;
}

export class EmailVerifiedApplicationEvent extends ApplicationEvent<EmailVerifiedEventPayload> {
  constructor(payload: EmailVerifiedEventPayload) {
    super(payload, EmailVerifiedApplicationEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.email_verified_application';
  }
}
