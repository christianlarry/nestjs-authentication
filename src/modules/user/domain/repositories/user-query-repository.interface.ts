export const USER_QUERY_REPOSITORY_TOKEN = Symbol('USER_QUERY_REPOSITORY');

// ─────────────────────────────────────────────
// Result DTOs (read-side / query models)
// ─────────────────────────────────────────────

export interface AddressResult {
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

export interface UserProfileResult {
  id: string;
  accountId: string;
  name: string;
  gender: string | null;
  dateOfBirth: Date | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  addresses: AddressResult[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UserListItemResult {
  id: string;
  accountId: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface FindAllUsersQuery {
  skip?: number;
  take?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface FindAllUsersResult {
  data: UserListItemResult[];
  total: number;
}

// ─────────────────────────────────────────────
// Query repository interface
// ─────────────────────────────────────────────

/**
 * Query repository for user profiles.
 * Returns plain DTOs — never entities — optimised for read operations (read side of CQRS).
 */
export interface UserQueryRepository {
  /** Get a full user profile view by the user's own ID. Returns null if not found. */
  findById(id: string): Promise<UserProfileResult | null>;

  /** Get a full user profile view by the linked Account ID. Returns null if not found. */
  findByAccountId(accountId: string): Promise<UserProfileResult | null>;

  /** Paginated list of users with optional filtering and sorting. */
  findAll(query: FindAllUsersQuery): Promise<FindAllUsersResult>;
}
