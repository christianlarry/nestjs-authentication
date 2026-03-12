import { DomainEvent } from "src/core/domain/domain-event.base";
import { AuthProvider } from "../enums/auth-provider.enum";

interface UserCreatedFromOAuthEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly provider: AuthProvider;
  readonly fullName: string;
  readonly createdAt: Date;
}

export class UserCreatedFromOAuthEvent extends DomainEvent<UserCreatedFromOAuthEventPayload> {
  constructor(
    payload: UserCreatedFromOAuthEventPayload
  ) {
    super(
      payload,
      UserCreatedFromOAuthEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.created_from_oauth';
  }
}
