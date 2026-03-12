import { DomainEvent } from "src/core/domain/domain-event.base";

interface UserLoggedInEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly loginAt: Date;
}

export class UserLoggedInEvent extends DomainEvent<UserLoggedInEventPayload> {
  constructor(
    payload: UserLoggedInEventPayload
  ) {
    super(
      payload,
      UserLoggedInEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.logged_in';
  }
}
