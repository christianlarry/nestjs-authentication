import { DomainError } from 'src/core/domain/domain-error.base';
import { UserErrorCode } from './enums/user-error-code.enum';

export class AddressNotFoundError extends DomainError {
  readonly code = UserErrorCode.ADDRESS_NOT_FOUND;

  constructor(message: string = 'Address not found.') {
    super(message);
  }
}
