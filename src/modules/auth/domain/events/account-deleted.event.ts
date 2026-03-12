import { DomainEvent } from 'src/core/domain/domain-event.base';

interface AccountDeletedEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly deletedAt: Date;
}

export class AccountDeletedEvent extends DomainEvent<AccountDeletedEventPayload> {
  constructor(payload: AccountDeletedEventPayload) {
    super(payload, AccountDeletedEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.deleted';
  }
}
