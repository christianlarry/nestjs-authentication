import { DomainEvent } from 'src/core/domain/domain-event.base';

interface AccountSuspendedEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly suspendedAt: Date;
}

export class AccountSuspendedEvent extends DomainEvent<AccountSuspendedEventPayload> {
  constructor(payload: AccountSuspendedEventPayload) {
    super(payload, AccountSuspendedEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.suspended';
  }
}
