import { DomainEvent } from 'src/core/domain/domain-event.base';

interface AccountRegisteredEventPayload {
  readonly accountId: string;
  readonly email: string;
}

export class AccountRegisteredEvent extends DomainEvent<AccountRegisteredEventPayload> {
  constructor(payload: AccountRegisteredEventPayload) {
    super(payload, AccountRegisteredEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.registered';
  }
}
