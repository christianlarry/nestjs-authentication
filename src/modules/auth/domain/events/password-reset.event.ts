import { DomainEvent } from "src/core/domain/domain-event.base";

interface PasswordResetEventPayload {
  readonly accountId: string;
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
    return 'account.password_reset';
  }
}
