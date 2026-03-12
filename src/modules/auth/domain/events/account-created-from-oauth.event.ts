import { DomainEvent } from 'src/core/domain/domain-event.base';
import { AuthProvider } from '../enums/auth-provider.enum';

interface AccountCreatedFromOAuthEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly provider: AuthProvider;
  readonly fullName: string;
  readonly createdAt: Date;
}

export class AccountCreatedFromOAuthEvent extends DomainEvent<AccountCreatedFromOAuthEventPayload> {
  constructor(payload: AccountCreatedFromOAuthEventPayload) {
    super(payload, AccountCreatedFromOAuthEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.created_from_oauth';
  }
}
