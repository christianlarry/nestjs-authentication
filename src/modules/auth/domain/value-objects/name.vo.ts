import { InvalidNameError } from "../errors/invalid-name.error";

export class Name {
  private readonly fullName: string;

  public static readonly REGEX: RegExp = /^[a-zA-Zà-žÀ-Ž'´`-]{3,}([ ][a-zA-Zà-žÀ-Ž'´`-]{1,})*$/; // Allows letters (including accented), spaces, apostrophes, and hyphens

  private constructor(
    fullName: string
  ) {
    this.validate(fullName);

    this.fullName = this.sanitaize(fullName);
  }

  private validate(fullName: string) {
    // Display name validation
    if (fullName.trim().length === 0) { throw new InvalidNameError('Full name cannot be empty'); }
    if (fullName.trim().length < 3) { throw new InvalidNameError('Full name must be at least 3 characters long'); }
    if (fullName.trim().length > 100) { throw new InvalidNameError('Full name cannot exceed 100 characters'); }
    if (!Name.REGEX.test(fullName)) { throw new InvalidNameError('Full name contains invalid characters or format'); }
  }

  private sanitaize(fullName: string): string {
    const sanitized: string = fullName
      .trim()
      .replace(/[^a-zA-Zà-žÀ-Ž'´`-\s]/g, '') // Remove invalid characters except letters, spaces, apostrophes, and hyphens
      .replace(/[-]{2,}/g, '-') // Replace multiple hyphens with a single hyphen
      .replace(/[ ]{2,}/g, ' ') // Replace multiple spaces with a single space
      .replace(/[\s]-|-[\s]/g, '-') // Remove spaces around hyphens
      .replace(/\s{2,}/g, ' '); // Final trim of multiple spaces

    return sanitized;
  }

  public static create(fullName: string): Name {
    return new Name(fullName);
  }

  public getFullName(): string {
    return this.fullName;
  }

  public getFirstName(): string {
    return this.fullName.split(' ')[0];
  }

  public getLastName(): string {
    if (this.fullName.split(' ').length === 1) return this.fullName; // If there's only one name, return it as the last name

    return this.fullName.split(' ').slice(1).join(' ');
  }

  public getInitials(): string {
    if (this.fullName.split(' ').length === 1) return this.fullName.charAt(0).toUpperCase(); // If there's only one name, return its initial

    return this.fullName.split(' ').map(name => name.charAt(0).toUpperCase()).join('');
  }

  public equals(other: Name): boolean {
    return this.fullName === other.fullName;
  }
}