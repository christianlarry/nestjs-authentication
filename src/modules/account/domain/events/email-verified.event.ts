import { DomainEvent } from "src/core/domain/domain-event.base";

interface EmailVerifiedEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly verifiedAt: Date;
}

export class EmailVerifiedEvent extends DomainEvent<EmailVerifiedEventPayload> {
  constructor(
    payload: EmailVerifiedEventPayload
  ) {
    super(
      payload,
      EmailVerifiedEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.email_verified';
  }
}
