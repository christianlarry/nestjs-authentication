import { DomainEvent } from "src/core/domain/domain-event.base";

interface AuthUserUpdatedEventPayload {
  userId: string,
  email: string,
  updatedAt: Date
}

export class AuthUserUpdatedEvent extends DomainEvent<AuthUserUpdatedEventPayload> {
  constructor(
    payload: AuthUserUpdatedEventPayload
  ) {
    super(
      payload,
      AuthUserUpdatedEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'auth.user_updated';
  }
}