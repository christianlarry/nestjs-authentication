import { ApplicationError } from "src/core/application/application-error.base";
import { AuthApplicationErrorCode } from "./enum/auth-application-error-code.enum";

export class AccountNotFoundError extends ApplicationError {

  readonly code = AuthApplicationErrorCode.ACCOUNT_NOT_FOUND;

  constructor(identifier: string) {
    super(`Account with id or email "${identifier}" not found.`);
  }
}