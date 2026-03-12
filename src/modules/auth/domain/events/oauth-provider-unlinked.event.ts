import { DomainEvent } from "src/core/domain/domain-event.base";
import { AuthProvider } from "../enums/auth-provider.enum";

interface OAuthProviderUnlinkedEventPayload {
  readonly accountId: string;
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
    return 'account.oauth_provider_unlinked';
  }
}
