import { AddressId } from '../value-objects/address-id.vo';
import { InvalidAddressError } from '../errors';

// ─────────────────────────────────────────────
// Props & Params interfaces
// ─────────────────────────────────────────────

export interface AddressProps {
  label: string;
  recipient: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAddressParams {
  label: string;
  recipient: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface UpdateAddressParams {
  label?: string;
  recipient?: string;
  phone?: string;
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
}

// ─────────────────────────────────────────────
// Address Entity (child entity of User aggregate)
// ─────────────────────────────────────────────

/**
 * Address is a child entity within the User aggregate.
 * It does NOT extend AggregateRoot — all mutations must go through the User aggregate.
 */
export class Address {
  private readonly _id: AddressId;
  private props: AddressProps;

  private constructor(props: AddressProps, id?: AddressId) {
    this._id = id ?? AddressId.create();
    this.props = props;
    this.validate();
  }

  // ─────────────────────────────────────────────
  // Factory methods
  // ─────────────────────────────────────────────

  public static create(params: CreateAddressParams): Address {
    const now = new Date();
    return new Address({
      label: params.label.trim(),
      recipient: params.recipient.trim(),
      phone: params.phone.trim(),
      street: params.street.trim(),
      city: params.city.trim(),
      province: params.province.trim(),
      postalCode: params.postalCode.trim(),
      country: params.country?.trim() ?? 'Indonesia',
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      isDefault: params.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static reconstruct(props: AddressProps, id: AddressId): Address {
    return new Address(props, id);
  }

  // ─────────────────────────────────────────────
  // Mutations (called only from User aggregate)
  // ─────────────────────────────────────────────

  /** Apply partial updates to address fields. */
  public update(params: UpdateAddressParams): void {
    if (params.label !== undefined) this.props.label = params.label.trim();
    if (params.recipient !== undefined) this.props.recipient = params.recipient.trim();
    if (params.phone !== undefined) this.props.phone = params.phone.trim();
    if (params.street !== undefined) this.props.street = params.street.trim();
    if (params.city !== undefined) this.props.city = params.city.trim();
    if (params.province !== undefined) this.props.province = params.province.trim();
    if (params.postalCode !== undefined) this.props.postalCode = params.postalCode.trim();
    if (params.country !== undefined) this.props.country = params.country.trim();
    if (params.latitude !== undefined) this.props.latitude = params.latitude;
    if (params.longitude !== undefined) this.props.longitude = params.longitude;

    this.props.updatedAt = new Date();
    this.validate();
  }

  /** Mark this address as the default shipping address. */
  public markAsDefault(): void {
    this.props.isDefault = true;
    this.props.updatedAt = new Date();
  }

  /** Remove the default designation from this address. */
  public unmarkAsDefault(): void {
    this.props.isDefault = false;
    this.props.updatedAt = new Date();
  }

  // ─────────────────────────────────────────────
  // Property getters
  // ─────────────────────────────────────────────

  public get id(): AddressId {
    return this._id;
  }

  public get label(): string {
    return this.props.label;
  }

  public get recipient(): string {
    return this.props.recipient;
  }

  public get phone(): string {
    return this.props.phone;
  }

  public get street(): string {
    return this.props.street;
  }

  public get city(): string {
    return this.props.city;
  }

  public get province(): string {
    return this.props.province;
  }

  public get postalCode(): string {
    return this.props.postalCode;
  }

  public get country(): string {
    return this.props.country;
  }

  public get latitude(): number | null {
    return this.props.latitude;
  }

  public get longitude(): number | null {
    return this.props.longitude;
  }

  public get isDefault(): boolean {
    return this.props.isDefault;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ─────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────

  private validate(): void {
    if (!this.props.label || this.props.label.length === 0) {
      throw new InvalidAddressError('Address label is required.');
    }
    if (!this.props.recipient || this.props.recipient.length === 0) {
      throw new InvalidAddressError('Recipient name is required.');
    }
    if (!this.props.phone || this.props.phone.length === 0) {
      throw new InvalidAddressError('Phone number is required for delivery.');
    }
    if (!this.props.street || this.props.street.length === 0) {
      throw new InvalidAddressError('Street address is required.');
    }
    if (!this.props.city || this.props.city.length === 0) {
      throw new InvalidAddressError('City is required.');
    }
    if (!this.props.province || this.props.province.length === 0) {
      throw new InvalidAddressError('Province is required.');
    }
    if (!this.props.postalCode || this.props.postalCode.length === 0) {
      throw new InvalidAddressError('Postal code is required.');
    }
  }
}
