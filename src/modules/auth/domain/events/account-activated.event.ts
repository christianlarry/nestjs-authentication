import { DomainEvent } from 'src/core/domain/domain-event.base';

interface AccountActivatedEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly activatedAt: Date;
}

export class AccountActivatedEvent extends DomainEvent<AccountActivatedEventPayload> {
  constructor(payload: AccountActivatedEventPayload) {
    super(payload, AccountActivatedEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.activated';
  }
}
