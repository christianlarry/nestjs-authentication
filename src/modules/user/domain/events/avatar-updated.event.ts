import { DomainEvent } from 'src/core/domain/domain-event.base';

export interface AvatarUpdatedEventPayload {
  readonly userId: string;
  readonly accountId: string;
  readonly avatarUrl: string | null;
  readonly updatedAt: Date;
}

export class AvatarUpdatedEvent extends DomainEvent<AvatarUpdatedEventPayload> {
  constructor(payload: AvatarUpdatedEventPayload) {
    super(payload, AvatarUpdatedEvent.EventName);
  }

  public static get EventName(): string {
    return 'user.avatar_updated';
  }
}
