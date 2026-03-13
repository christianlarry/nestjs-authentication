import { ApplicationError } from "src/core/application/application-error.base";
import { AuthApplicationErrorCode } from "./enum/auth-application-error-code.enum";

export class EmailAlreadyExistsError extends ApplicationError {
  readonly code: string = AuthApplicationErrorCode.EMAIL_ALREADY_EXISTS;

  constructor(email: string) {
    super(`The email '${email}' is already in use.`);
  }
}