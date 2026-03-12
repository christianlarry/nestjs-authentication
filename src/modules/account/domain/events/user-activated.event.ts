import { DomainEvent } from "src/core/domain/domain-event.base";

interface UserActivatedEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly activatedAt: Date;
}

export class UserActivatedEvent extends DomainEvent<UserActivatedEventPayload> {
  constructor(
    payload: UserActivatedEventPayload
  ) {
    super(
      payload,
      UserActivatedEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.activated';
  }
}
