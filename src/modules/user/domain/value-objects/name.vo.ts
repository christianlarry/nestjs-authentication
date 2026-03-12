import { InvalidUserNameError } from '../errors';

/**
 * Name value object for the User profile.
 * Accepts full names with letters (including accented), spaces, apostrophes, and hyphens.
 */
export class Name {
  private readonly fullName: string;

  public static readonly REGEX: RegExp =
    /^[a-zA-Zà-žÀ-Ž'´`-]{3,}([ ][a-zA-Zà-žÀ-Ž'´`-]{1,})*$/;

  private constructor(fullName: string) {
    this.validate(fullName);
    this.fullName = this.sanitize(fullName);
  }

  private validate(fullName: string): void {
    if (fullName.trim().length === 0) {
      throw new InvalidUserNameError('Name cannot be empty.');
    }
    if (fullName.trim().length < 3) {
      throw new InvalidUserNameError('Name must be at least 3 characters long.');
    }
    if (fullName.trim().length > 100) {
      throw new InvalidUserNameError('Name cannot exceed 100 characters.');
    }
    if (!Name.REGEX.test(fullName.trim())) {
      throw new InvalidUserNameError(
        'Name contains invalid characters. Only letters, spaces, apostrophes, and hyphens are allowed.',
      );
    }
  }

  private sanitize(fullName: string): string {
    return fullName
      .trim()
      .replace(/[^a-zA-Zà-žÀ-Ž'´`\-\s]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/ {2,}/g, ' ')
      .replace(/\s-|-\s/g, '-')
      .replace(/\s{2,}/g, ' ');
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
    const parts = this.fullName.split(' ');
    return parts.length === 1 ? this.fullName : parts.slice(1).join(' ');
  }

  public getInitials(): string {
    const parts = this.fullName.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return parts.map((p) => p.charAt(0).toUpperCase()).join('');
  }

  public equals(other: Name): boolean {
    return this.fullName === other.fullName;
  }
}
