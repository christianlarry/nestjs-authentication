import { DomainEvent } from "src/core/domain/domain-event.base";
import { AuthProvider } from "../enums/auth-provider.enum";

interface OAuthProviderLinkedEventPayload {
  readonly userId: string;
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
    return 'user.oauth_provider_linked';
  }
}
