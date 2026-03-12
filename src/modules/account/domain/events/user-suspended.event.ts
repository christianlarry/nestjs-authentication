import { DomainEvent } from "src/core/domain/domain-event.base";

interface UserSuspendedEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly suspendedAt: Date;
}

export class UserSuspendedEvent extends DomainEvent<UserSuspendedEventPayload> {
  constructor(
    payload: UserSuspendedEventPayload
  ) {
    super(
      payload,
      UserSuspendedEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.suspended';
  }
}
