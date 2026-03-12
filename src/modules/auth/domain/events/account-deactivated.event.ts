import { DomainEvent } from 'src/core/domain/domain-event.base';

interface AccountDeactivatedEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly deactivatedAt: Date;
}

export class AccountDeactivatedEvent extends DomainEvent<AccountDeactivatedEventPayload> {
  constructor(payload: AccountDeactivatedEventPayload) {
    super(payload, AccountDeactivatedEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.deactivated';
  }
}
