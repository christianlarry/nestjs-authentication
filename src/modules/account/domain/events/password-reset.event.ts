import { DomainEvent } from "src/core/domain/domain-event.base";

interface PasswordResetEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly resetAt: Date;
}

export class PasswordResetEvent extends DomainEvent<PasswordResetEventPayload> {
  constructor(
    payload: PasswordResetEventPayload
  ) {
    super(
      payload,
      PasswordResetEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.password_reset';
  }
}
