import { DomainEvent } from 'src/core/domain/domain-event.base';
import { AuthProvider } from '../enums/auth-provider.enum';

interface AccountLoggedInWithOAuthEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly provider: AuthProvider;
  readonly avatarUrl: string | null;
  readonly fullName: string;
}

export class AccountLoggedInWithOAuthEvent extends DomainEvent<AccountLoggedInWithOAuthEventPayload> {
  constructor(payload: AccountLoggedInWithOAuthEventPayload) {
    super(payload, AccountLoggedInWithOAuthEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.logged_in_with_oauth';
  }
}
