import { DomainError } from 'src/core/domain/domain-error.base';
import { UserErrorCode } from './enums/user-error-code.enum';

export class InvalidAddressError extends DomainError {
  readonly code = UserErrorCode.INVALID_ADDRESS;

  constructor(message: string = 'The provided address data is invalid.') {
    super(message);
  }
}
