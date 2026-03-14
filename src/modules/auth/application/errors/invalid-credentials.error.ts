import { ApplicationError } from "src/core/application/application-error.base";
import { AuthApplicationErrorCode } from "./enum/auth-application-error-code.enum";

export class InvalidCredentialsError extends ApplicationError {
  readonly code: string = AuthApplicationErrorCode.INVALID_CREDENTIALS;

  constructor(message: string = 'Invalid credentials') {
    super(message);
  }
}