import { ApplicationError } from "src/core/application/application-error.base";
import { AuthApplicationErrorCode } from "./enum/auth-application-error-code.enum";

export class InvalidOrExpiredTokenError extends ApplicationError {

  readonly code = AuthApplicationErrorCode.INVALID_OR_EXPIRED_TOKEN

  constructor(message: string = 'Invalid or expired token') {
    super(message);
  }
}