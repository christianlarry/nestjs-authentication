import { DomainEvent } from 'src/core/domain/domain-event.base';

export interface DefaultAddressChangedEventPayload {
  readonly userId: string;
  readonly newDefaultAddressId: string;
  readonly previousDefaultAddressId: string | null;
}

export class DefaultAddressChangedEvent extends DomainEvent<DefaultAddressChangedEventPayload> {
  constructor(payload: DefaultAddressChangedEventPayload) {
    super(payload, DefaultAddressChangedEvent.EventName);
  }

  public static get EventName(): string {
    return 'user.default_address_changed';
  }
}
