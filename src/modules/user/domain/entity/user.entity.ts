import { AggregateRoot } from 'src/core/domain/aggregate-root.base';
import { UserId } from '../value-objects/user-id.vo';
import { Name } from '../value-objects/name.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { AvatarUrl } from '../value-objects/avatar-url.vo';
import { AddressId } from '../value-objects/address-id.vo';
import { Gender } from '../enums/gender.enum';
import { Address, CreateAddressParams, UpdateAddressParams } from './address.entity';
import { AddressNotFoundError, UserNotFoundError } from '../errors';
import {
  UserProfileCreatedEvent,
  UserProfileUpdatedEvent,
  AvatarUpdatedEvent,
  AddressAddedEvent,
  AddressUpdatedEvent,
  AddressRemovedEvent,
  DefaultAddressChangedEvent,
} from '../events';

// ─────────────────────────────────────────────
// Props & Params interfaces
// ─────────────────────────────────────────────

export interface UserProps {
  /** Reference to the Account aggregate (foreign key — kept as a string in this BC). */
  accountId: string;
  name: Name;
  gender: Gender | null;
  dateOfBirth: Date | null;
  phoneNumber: PhoneNumber | null;
  avatarUrl: AvatarUrl | null;
  addresses: Address[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateUserParams {
  accountId: string;
  name: string;
  gender?: Gender;
  dateOfBirth?: Date;
  phoneNumber?: string;
  avatarUrl?: string;
}

export interface UpdateUserProfileParams {
  name?: string;
  gender?: Gender | null;
  dateOfBirth?: Date | null;
  phoneNumber?: string | null;
}

// ─────────────────────────────────────────────
// User Aggregate Root
// ─────────────────────────────────────────────

export class User extends AggregateRoot {
  private readonly _id: UserId;
  private props: UserProps;

  private constructor(props: UserProps, id?: UserId) {
    super();
    this._id = id ?? UserId.create();
    this.props = props;
    this.validate();
  }

  // ─────────────────────────────────────────────
  // Factory methods
  // ─────────────────────────────────────────────

  /** Create a new user profile linked to an Account. */
  public static create(params: CreateUserParams): User {
    const now = new Date();
    const user = new User({
      accountId: params.accountId,
      name: Name.create(params.name),
      gender: params.gender ?? null,
      dateOfBirth: params.dateOfBirth ?? null,
      phoneNumber: params.phoneNumber ? PhoneNumber.create(params.phoneNumber) : null,
      avatarUrl: params.avatarUrl ? AvatarUrl.create(params.avatarUrl) : null,
      addresses: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    user.addDomainEvent(
      new UserProfileCreatedEvent({
        userId: user._id.getValue(),
        accountId: params.accountId,
        name: params.name,
        createdAt: now,
      }),
    );

    return user;
  }

  /** Reconstruct a User from persisted data (no domain events emitted). */
  public static reconstruct(props: UserProps, id: UserId): User {
    return new User(props, id);
  }

  // ─────────────────────────────────────────────
  // Domain behaviors
  // ─────────────────────────────────────────────

  /** Update mutable profile fields. Only provided (non-undefined) fields are changed. */
  public updateProfile(params: UpdateUserProfileParams): void {
    if (params.name !== undefined) {
      this.props.name = Name.create(params.name);
    }
    if (params.gender !== undefined) {
      this.props.gender = params.gender;
    }
    if (params.dateOfBirth !== undefined) {
      this.props.dateOfBirth = params.dateOfBirth;
    }
    if (params.phoneNumber !== undefined) {
      this.props.phoneNumber =
        params.phoneNumber !== null ? PhoneNumber.create(params.phoneNumber) : null;
    }

    this.applyChange();
    this.addDomainEvent(
      new UserProfileUpdatedEvent({
        userId: this._id.getValue(),
        accountId: this.props.accountId,
        updatedAt: this.props.updatedAt,
      }),
    );
  }

  /** Replace the profile avatar URL. Pass null to remove the avatar. */
  public updateAvatarUrl(avatarUrl: string | null): void {
    this.props.avatarUrl = avatarUrl !== null ? AvatarUrl.create(avatarUrl) : null;
    this.applyChange();

    this.addDomainEvent(
      new AvatarUpdatedEvent({
        userId: this._id.getValue(),
        accountId: this.props.accountId,
        avatarUrl,
        updatedAt: this.props.updatedAt,
      }),
    );
  }

  /**
   * Add a new shipping address to this user profile.
   * If isDefault is true (or if this is the first address), it becomes the default.
   */
  public addAddress(params: CreateAddressParams): void {
    const makeDefault =
      params.isDefault === true || this.props.addresses.length === 0;

    if (makeDefault) {
      this.props.addresses.forEach((a) => a.unmarkAsDefault());
      params = { ...params, isDefault: true };
    }

    const address = Address.create(params);
    this.props.addresses = [...this.props.addresses, address];
    this.applyChange();

    this.addDomainEvent(
      new AddressAddedEvent({
        userId: this._id.getValue(),
        addressId: address.id.getValue(),
        label: address.label,
        isDefault: address.isDefault,
      }),
    );
  }

  /** Update an existing address by ID. Throws AddressNotFoundError if not found. */
  public updateAddress(addressId: AddressId, params: UpdateAddressParams): void {
    const address = this.findAddressOrThrow(addressId);
    address.update(params);
    this.applyChange();

    this.addDomainEvent(
      new AddressUpdatedEvent({
        userId: this._id.getValue(),
        addressId: addressId.getValue(),
        label: address.label,
      }),
    );
  }

  /**
   * Remove an address by ID.
   * If the removed address was the default and other addresses exist,
   * the first remaining address becomes the new default.
   */
  public removeAddress(addressId: AddressId): void {
    const address = this.findAddressOrThrow(addressId);
    const wasDefault = address.isDefault;

    this.props.addresses = this.props.addresses.filter(
      (a) => !a.id.equals(addressId),
    );

    if (wasDefault && this.props.addresses.length > 0) {
      this.props.addresses[0].markAsDefault();
    }

    this.applyChange();
    this.addDomainEvent(
      new AddressRemovedEvent({
        userId: this._id.getValue(),
        addressId: addressId.getValue(),
      }),
    );
  }

  /**
   * Designate a different address as the default.
   * Clears the default flag from all other addresses.
   */
  public setDefaultAddress(addressId: AddressId): void {
    const address = this.findAddressOrThrow(addressId);

    const previousDefault = this.props.addresses.find(
      (a) => a.isDefault && !a.id.equals(addressId),
    );

    this.props.addresses.forEach((a) => a.unmarkAsDefault());
    address.markAsDefault();
    this.applyChange();

    this.addDomainEvent(
      new DefaultAddressChangedEvent({
        userId: this._id.getValue(),
        newDefaultAddressId: addressId.getValue(),
        previousDefaultAddressId: previousDefault?.id.getValue() ?? null,
      }),
    );
  }

  /** Soft-delete the user profile. */
  public softDelete(): void {
    if (this.props.deletedAt !== null) return;

    this.props.deletedAt = new Date();
    this.applyChange();
  }

  // ─────────────────────────────────────────────
  // Property getters
  // ─────────────────────────────────────────────

  public get id(): UserId {
    return this._id;
  }

  public get accountId(): string {
    return this.props.accountId;
  }

  public get name(): Name {
    return this.props.name;
  }

  public get gender(): Gender | null {
    return this.props.gender;
  }

  public get dateOfBirth(): Date | null {
    return this.props.dateOfBirth;
  }

  public get phoneNumber(): PhoneNumber | null {
    return this.props.phoneNumber;
  }

  public get avatarUrl(): AvatarUrl | null {
    return this.props.avatarUrl;
  }

  public get addresses(): Address[] {
    return [...this.props.addresses];
  }

  public get defaultAddress(): Address | null {
    return this.props.addresses.find((a) => a.isDefault) ?? null;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  public get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private findAddressOrThrow(addressId: AddressId): Address {
    const address = this.props.addresses.find((a) => a.id.equals(addressId));
    if (!address) {
      throw new AddressNotFoundError(
        `Address with ID "${addressId.getValue()}" not found on this user profile.`,
      );
    }
    return address;
  }

  private applyChange(): void {
    this.props.updatedAt = new Date();
    this.validate();
  }

  private validate(): void {
    if (!this.props.accountId || this.props.accountId.trim().length === 0) {
      throw new UserNotFoundError('User must be linked to an Account.');
    }
    const defaultAddresses = this.props.addresses.filter((a) => a.isDefault);
    if (defaultAddresses.length > 1) {
      throw new Error('Invariant violation: a user cannot have more than one default address.');
    }
    if (this.props.addresses.length > 0 && defaultAddresses.length === 0) {
      throw new Error('Invariant violation: at least one address must be marked as default when addresses exist.');
    }
  }
}
