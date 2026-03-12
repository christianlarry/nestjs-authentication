import { InvalidPhoneNumberError } from '../errors';

/**
 * PhoneNumber value object.
 * Accepts international E.164-style numbers as well as localised formats.
 * Examples: +62 812-3456-7890, +1 (555) 123-4567, 08123456789
 */
export class PhoneNumber {
  private readonly value: string;

  /** Normalised storage regex: optional +, then 7–15 digits (spaces/hyphens/parens stripped) */
  private static readonly DIGIT_PATTERN = /^\+?[0-9\s\-().]{7,20}$/;

  private constructor(value: string) {
    const trimmed = value.trim();
    if (!PhoneNumber.DIGIT_PATTERN.test(trimmed)) {
      throw new InvalidPhoneNumberError(
        `"${trimmed}" is not a valid phone number. Expected 7–15 digits with an optional leading "+".`,
      );
    }
    this.value = trimmed;
  }

  public static create(value: string): PhoneNumber {
    return new PhoneNumber(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }
}
