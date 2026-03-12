import { DomainEvent } from 'src/core/domain/domain-event.base';

interface AccountLoggedInEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly loginAt: Date;
}

export class AccountLoggedInEvent extends DomainEvent<AccountLoggedInEventPayload> {
  constructor(payload: AccountLoggedInEventPayload) {
    super(payload, AccountLoggedInEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.logged_in';
  }
}
