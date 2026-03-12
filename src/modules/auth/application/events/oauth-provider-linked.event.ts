import { ApplicationEvent } from 'src/core/application/application-event.base';
import { AuthProvider } from '../../domain/enums/auth-provider.enum';

/**
 * Fired after an OAuth provider is linked to an existing account.
 * Used for side effects: sync provider profile data, update user profile, audit logging, etc.
 */
export interface OAuthProviderLinkedEventPayload {
  readonly accountId: string;
  readonly email: string;
  readonly provider: AuthProvider;
  readonly linkedAt: Date;
}

export class OAuthProviderLinkedApplicationEvent extends ApplicationEvent<OAuthProviderLinkedEventPayload> {
  constructor(payload: OAuthProviderLinkedEventPayload) {
    super(payload, OAuthProviderLinkedApplicationEvent.EventName);
  }

  public static get EventName(): string {
    return 'account.oauth_provider_linked_application';
  }
}
