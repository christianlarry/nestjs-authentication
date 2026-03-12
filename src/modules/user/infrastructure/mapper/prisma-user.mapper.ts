import type {
  User as PrismaUser,
  Address as PrismaAddress,
} from 'src/core/infrastructure/persistence/prisma/generated/client/client';
import type { Gender as PrismaGender } from 'src/core/infrastructure/persistence/prisma/generated/client/enums';
import { User } from '../../domain/entity/user.entity';
import { Address } from '../../domain/entity/address.entity';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { AddressId } from '../../domain/value-objects/address-id.vo';
import { Name } from '../../domain/value-objects/name.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { AvatarUrl } from '../../domain/value-objects/avatar-url.vo';
import { Gender } from '../../domain/enums/gender.enum';

// ─────────────────────────────────────────────
// Raw Prisma type with included relations
// ─────────────────────────────────────────────

export type PrismaUserWithAddresses = PrismaUser & {
  addresses: PrismaAddress[];
};

// ─────────────────────────────────────────────
// Persistence shapes
// ─────────────────────────────────────────────

export interface UserPersistenceData {
  id: string;
  accountId: string;
  name: string;
  gender: PrismaGender | null;
  dateOfBirth: Date | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AddressPersistenceData {
  id: string;
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

// ─────────────────────────────────────────────
// Mapper
// ─────────────────────────────────────────────

export class PrismaUserMapper {
  /**
   * Reconstruct a User domain aggregate (with all child Address entities)
   * from a raw Prisma row. Never emits domain events.
   */
  static toDomain(raw: PrismaUserWithAddresses): User {
    const addresses = raw.addresses.map((a) => PrismaUserMapper.addressToDomain(a));

    return User.reconstruct(
      {
        accountId: raw.accountId,
        name: Name.create(raw.name),
        gender: raw.gender ? (raw.gender as Gender) : null,
        dateOfBirth: raw.dateOfBirth,
        phoneNumber: raw.phoneNumber ? PhoneNumber.create(raw.phoneNumber) : null,
        avatarUrl: raw.avatarUrl ? AvatarUrl.create(raw.avatarUrl) : null,
        addresses,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        deletedAt: raw.deletedAt,
      },
      UserId.fromString(raw.id),
    );
  }

  /**
   * Flatten a User aggregate's scalar fields to a plain object for Prisma writes.
   * Addresses are intentionally excluded — the repository handles them
   * via deleteMany + create nested writes.
   */
  static toPersistence(user: User): UserPersistenceData {
    return {
      id: user.id.getValue(),
      accountId: user.accountId,
      name: user.name.getFullName(),
      gender: user.gender as PrismaGender | null,
      dateOfBirth: user.dateOfBirth,
      phoneNumber: user.phoneNumber?.getValue() ?? null,
      avatarUrl: user.avatarUrl?.getValue() ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  /**
   * Map an Address child entity to its Prisma-ready shape.
   * Coordinates are stored as Prisma.Decimal for DB accuracy.
   */
  static addressToPersistence(address: Address, userId: string): AddressPersistenceData & { userId: string } {
    return {
      id: address.id.getValue(),
      userId,
      label: address.label,
      recipient: address.recipient,
      phone: address.phone,
      street: address.street,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private static addressToDomain(raw: PrismaAddress): Address {
    return Address.reconstruct(
      {
        label: raw.label,
        recipient: raw.recipient,
        phone: raw.phone,
        street: raw.street,
        city: raw.city,
        province: raw.province,
        postalCode: raw.postalCode,
        country: raw.country,
        latitude: raw.latitude !== null ? raw.latitude.toNumber() : null,
        longitude: raw.longitude !== null ? raw.longitude.toNumber() : null,
        isDefault: raw.isDefault,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      AddressId.fromString(raw.id),
    );
  }
}
