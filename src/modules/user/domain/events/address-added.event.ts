import { DomainEvent } from 'src/core/domain/domain-event.base';

export interface AddressAddedEventPayload {
  readonly userId: string;
  readonly addressId: string;
  readonly label: string;
  readonly isDefault: boolean;
}

export class AddressAddedEvent extends DomainEvent<AddressAddedEventPayload> {
  constructor(payload: AddressAddedEventPayload) {
    super(payload, AddressAddedEvent.EventName);
  }

  public static get EventName(): string {
    return 'user.address_added';
  }
}
