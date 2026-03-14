import { ApplicationError } from 'src/core/application/application-error.base';
import { AuthApplicationErrorCode } from './enum/auth-application-error-code.enum';

export class EmailAlreadyVerifiedError extends ApplicationError {
  readonly code = AuthApplicationErrorCode.EMAIL_ALREADY_VERIFIED;

  constructor(email: string) {
    super(`Email '${email}' is already verified.`);
  }
}
