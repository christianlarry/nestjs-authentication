import { ApplicationError } from 'src/core/application/application-error.base';
import { AuthApplicationErrorCode } from './enum/auth-application-error-code.enum';
import { AuthProvider } from '../../domain/enums/auth-provider.enum';

export class ProviderAlreadyLinkedError extends ApplicationError {
  readonly code = AuthApplicationErrorCode.PROVIDER_ALREADY_LINKED;

  constructor(provider: AuthProvider, accountId: string) {
    super(`Provider '${provider}' is already linked for account '${accountId}'.`);
  }
}
