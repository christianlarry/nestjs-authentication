import { DomainEvent } from "src/core/domain/domain-event.base";

interface UserDeletedEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly deletedAt: Date;
}

export class UserDeletedEvent extends DomainEvent<UserDeletedEventPayload> {
  constructor(
    payload: UserDeletedEventPayload
  ) {
    super(
      payload,
      UserDeletedEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.deleted';
  }
}
