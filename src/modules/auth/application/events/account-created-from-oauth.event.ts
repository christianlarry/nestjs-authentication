import { ApplicationEvent } from 'src/core/application/application-event.base';
import { AuthProvider } from '../../domain/enums/auth-provider.enum';

/**
 * Fired after an account is created via OAuth provider (email is pre-verified).
 * Used for side effects: send welcome email, create user profile, initiate onboarding, etc.
 */
export interface AccountCreatedFromOAuthEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly provider: AuthProvider;
  readonly fullName: string;
  readonly createdAt: Date;
}

export class AccountCreatedFromOAuthApplicationEvent extends ApplicationEvent<AccountCreatedFromOAuthEventPayload> {
  constructor(payload: AccountCreatedFromOAuthEventPayload) {
    super(payload, AccountCreatedFromOAuthApplicationEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.created_from_oauth_application';
  }
}
