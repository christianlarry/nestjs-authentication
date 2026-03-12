import { DomainEvent } from "src/core/domain/domain-event.base";

interface UserDeactivatedEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly deactivatedAt: Date;
}

export class UserDeactivatedEvent extends DomainEvent<UserDeactivatedEventPayload> {
  constructor(
    payload: UserDeactivatedEventPayload
  ) {
    super(
      payload,
      UserDeactivatedEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.deactivated';
  }
}
