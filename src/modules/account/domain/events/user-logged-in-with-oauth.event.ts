import { DomainEvent } from "src/core/domain/domain-event.base";
import { AuthProvider } from "../enums/auth-provider.enum";

interface UserLoggedInWithOAuthEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly provider: AuthProvider; // e.g., 'google', 'facebook'
  readonly avatarUrl: string | null; // Optional, if you want to include user's avatar from the provider
  readonly fullName: string; // Optional, if you want to include user's full name from the provider
}

export class UserLoggedInWithOAuthEvent extends DomainEvent<UserLoggedInWithOAuthEventPayload> {
  constructor(
    payload: UserLoggedInWithOAuthEventPayload
  ) {
    super(
      payload,
      UserLoggedInWithOAuthEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.logged_in_with_oauth';
  }
}