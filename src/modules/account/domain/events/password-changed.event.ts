import { DomainEvent } from "src/core/domain/domain-event.base";

interface PasswordChangedEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly changedAt: Date;
}

export class PasswordChangedEvent extends DomainEvent<PasswordChangedEventPayload> {
  constructor(
    payload: PasswordChangedEventPayload
  ) {
    super(
      payload,
      PasswordChangedEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.password_changed';
  }
}
