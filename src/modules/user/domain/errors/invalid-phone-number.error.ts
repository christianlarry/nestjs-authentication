import { DomainError } from 'src/core/domain/domain-error.base';
import { UserErrorCode } from './enums/user-error-code.enum';

export class InvalidPhoneNumberError extends DomainError {
  readonly code = UserErrorCode.INVALID_PHONE_NUMBER;

  constructor(message: string = 'The provided phone number is invalid.') {
    super(message);
  }
}
