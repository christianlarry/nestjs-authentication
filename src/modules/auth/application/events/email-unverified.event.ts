import { ApplicationEvent } from 'src/core/application/application-event.base';

/**
 * Fired after an email address verification is revoked.
 * Used for side effects: revoke feature access, notify account holder, audit logging, etc.
 */
export interface EmailUnverifiedEventPayload {
  readonly accountId: string;
  readonly email: string;
}

export class EmailUnverifiedApplicationEvent extends ApplicationEvent<EmailUnverifiedEventPayload> {
  constructor(payload: EmailUnverifiedEventPayload) {
    super(payload, EmailUnverifiedApplicationEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.email_unverified_application';
  }
}
