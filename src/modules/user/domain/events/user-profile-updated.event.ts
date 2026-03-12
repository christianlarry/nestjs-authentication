import { DomainEvent } from 'src/core/domain/domain-event.base';

export interface UserProfileUpdatedEventPayload {
  readonly userId: string;
  readonly accountId: string;
  readonly updatedAt: Date;
}

export class UserProfileUpdatedEvent extends DomainEvent<UserProfileUpdatedEventPayload> {
  constructor(payload: UserProfileUpdatedEventPayload) {
    super(payload, UserProfileUpdatedEvent.EventName);
  }

  public static get EventName(): string {
    return 'user.profile_updated';
  }
}
