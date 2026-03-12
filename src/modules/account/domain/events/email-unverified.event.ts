import { DomainEvent } from "src/core/domain/domain-event.base";

interface EmailUnverifiedEventPayload {
  readonly userId: string;
  readonly email: string;
}

export class EmailUnverifiedEvent extends DomainEvent<EmailUnverifiedEventPayload> {
  constructor(
    payload: EmailUnverifiedEventPayload
  ) {
    super(
      payload,
      EmailUnverifiedEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.email_unverified';
  }
}
