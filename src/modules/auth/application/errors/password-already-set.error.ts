import { ApplicationError } from 'src/core/application/application-error.base';
import { AuthApplicationErrorCode } from './enum/auth-application-error-code.enum';

export class PasswordAlreadySetError extends ApplicationError {
  readonly code = AuthApplicationErrorCode.PASSWORD_ALREADY_SET;

  constructor(accountId: string) {
    super(`Password is already set for account '${accountId}'.`);
  }
}
