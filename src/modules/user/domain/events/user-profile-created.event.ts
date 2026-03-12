import { DomainEvent } from 'src/core/domain/domain-event.base';

export interface UserProfileCreatedEventPayload {
  readonly userId: string;
  readonly accountId: string;
  readonly name: string;
  readonly createdAt: Date;
}

export class UserProfileCreatedEvent extends DomainEvent<UserProfileCreatedEventPayload> {
  constructor(payload: UserProfileCreatedEventPayload) {
    super(payload, UserProfileCreatedEvent.EventName);
  }

  public static get EventName(): string {
    return 'user.profile_created';
  }
}
