import { ApplicationEvent } from 'src/core/application/application-event.base';

/**
 * Fired after an account is successfully registered via email/password.
 * Used for side effects: send verification email, initiate onboarding workflow, etc.
 */
export interface AccountRegisteredEventPayload {
  readonly accountId: string;
  readonly email: string;
}

export class AccountRegisteredApplicationEvent extends ApplicationEvent<AccountRegisteredEventPayload> {
  constructor(payload: AccountRegisteredEventPayload) {
    super(payload, AccountRegisteredApplicationEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.registered_application';
  }
}
