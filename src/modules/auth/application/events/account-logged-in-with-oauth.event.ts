import { ApplicationEvent } from 'src/core/application/application-event.base';
import { AuthProvider } from '../../domain/enums/auth-provider.enum';

/**
 * Fired after an account successfully logs in via OAuth provider.
 * Used for side effects: update last login, sync provider avatar, send login notification, etc.
 */
export interface AccountLoggedInWithOAuthEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly provider: AuthProvider;
  readonly avatarUrl: string | null;
  readonly fullName: string;
}

export class AccountLoggedInWithOAuthApplicationEvent extends ApplicationEvent<AccountLoggedInWithOAuthEventPayload> {
  constructor(payload: AccountLoggedInWithOAuthEventPayload) {
    super(payload, AccountLoggedInWithOAuthApplicationEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.logged_in_with_oauth_application';
  }
}
