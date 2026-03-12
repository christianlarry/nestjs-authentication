import { ApplicationEvent } from 'src/core/application/application-event.base';

/**
 * Fired after an account password is reset via the forgot-password flow.
 * Used for side effects: send notification email, invalidate all sessions, audit logging, etc.
 */
export interface PasswordResetEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly resetAt: Date;
}

export class PasswordResetApplicationEvent extends ApplicationEvent<PasswordResetEventPayload> {
  constructor(payload: PasswordResetEventPayload) {
    super(payload, PasswordResetApplicationEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.password_reset_application';
  }
}
