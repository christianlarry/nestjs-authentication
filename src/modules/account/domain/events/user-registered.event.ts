import { DomainEvent } from "src/core/domain/domain-event.base";

interface UserRegisteredEventPayload {
  readonly userId: string;
  readonly email: string;
}

export class UserRegisteredEvent extends DomainEvent<UserRegisteredEventPayload> {
  constructor(
    payload: UserRegisteredEventPayload
  ) {
    super(
      payload,
      UserRegisteredEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.registered';
  }
}