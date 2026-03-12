import { DomainEvent } from "src/core/domain/domain-event.base";
import { AuthProvider } from "../enums/auth-provider.enum";

interface OAuthProviderLinkedEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly provider: AuthProvider;
  readonly linkedAt: Date;
}

export class OAuthProviderLinkedEvent extends DomainEvent<OAuthProviderLinkedEventPayload> {
  constructor(
    payload: OAuthProviderLinkedEventPayload
  ) {
    super(
      payload,
      OAuthProviderLinkedEvent.EventName
    )
  }

  public static get EventName(): string {
    return 'account.oauth_provider_linked';
  }
}
