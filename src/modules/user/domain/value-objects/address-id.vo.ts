import { UniqueIdentifier } from 'src/core/domain/unique-identifier.base';
import { InvalidAddressError } from '../errors';

export class AddressId extends UniqueIdentifier {
  private constructor(value: string) {
    super(value, new InvalidAddressError(`Invalid AddressId: "${value}" is not a valid UUID.`));
  }

  public static create(): AddressId {
    return new AddressId(crypto.randomUUID());
  }

  public static fromString(value: string): AddressId {
    return new AddressId(value);
  }
}
