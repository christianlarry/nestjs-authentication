import { ApplicationEvent } from 'src/core/application/application-event.base';

/**
 * Fired after an account password is changed by the user.
 * Used for side effects: send notification email, invalidate other sessions, audit logging, etc.
 */
export interface PasswordChangedEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly changedAt: Date;
}

export class PasswordChangedApplicationEvent extends ApplicationEvent<PasswordChangedEventPayload> {
  constructor(payload: PasswordChangedEventPayload) {
    super(payload, PasswordChangedApplicationEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.password_changed_application';
  }
}
