import { ApplicationEvent } from 'src/core/application/application-event.base';

/**
 * Fired after an account successfully logs in via email/password.
 * Used for side effects: update last login timestamp, send login notification, audit logging, etc.
 */
export interface AccountLoggedInEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly loginAt: Date;
}

export class AccountLoggedInApplicationEvent extends ApplicationEvent<AccountLoggedInEventPayload> {
  constructor(payload: AccountLoggedInEventPayload) {
    super(payload, AccountLoggedInApplicationEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.logged_in_application';
  }
}
