import { DomainEvent } from 'src/core/domain/domain-event.base';

export interface AddressUpdatedEventPayload {
  readonly userId: string;
  readonly addressId: string;
  readonly label: string;
}

export class AddressUpdatedEvent extends DomainEvent<AddressUpdatedEventPayload> {
  constructor(payload: AddressUpdatedEventPayload) {
    super(payload, AddressUpdatedEvent.EventName);
  }

  public static get EventName(): string {
    return 'user.address_updated';
  }
}
