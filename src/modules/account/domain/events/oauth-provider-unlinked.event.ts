import { DomainEvent } from "src/core/domain/domain-event.base";
import { AuthProvider } from "../enums/auth-provider.enum";

interface OAuthProviderUnlinkedEventPayload {
  readonly userId: string;
  readonly email: string;
  readonly provider: AuthProvider;
  readonly unlinkedAt: Date;
}

export class OAuthProviderUnlinkedEvent extends DomainEvent<OAuthProviderUnlinkedEventPayload> {
  constructor(
    payload: OAuthProviderUnlinkedEventPayload
  ) {
    super(
      payload,
      OAuthProviderUnlinkedEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'user.oauth_provider_unlinked';
  }
}
