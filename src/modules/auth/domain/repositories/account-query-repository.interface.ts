export const ACCOUNT_QUERY_REPOSITORY_TOKEN = Symbol('ACCOUNT_QUERY_REPOSITORY');

// ─────────────────────────────────────────────
// Result DTOs (read-side / query models)
// ─────────────────────────────────────────────

export interface AuthProviderResult {
  provider: string;
  providerId: string;
  linkedAt: Date;
}

export interface AccountDetailResult {
  id: string;
  email: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  role: string;
  status: string;
  twoFactorEnabled: boolean;
  providers: AuthProviderResult[];
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountListItemResult {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
}

export interface FindAllAccountsQuery {
  skip?: number;
  take?: number;
  search?: string;
  status?: string;
  role?: string;
  sortBy?: 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface FindAllAccountsResult {
  data: AccountListItemResult[];
  total: number;
}

// ─────────────────────────────────────────────
// Query repository interface
// ─────────────────────────────────────────────

/**
 * Query repository for accounts.
 * Returns plain DTOs — never entities — optimised for read operations (read side of CQRS).
 */
export interface AccountQueryRepository {
  /** Find an account's detail view by its ID. Returns null if not found. */
  findById(id: string): Promise<AccountDetailResult | null>;

  /** Find an account's detail view by email. Returns null if not found. */
  findByEmail(email: string): Promise<AccountDetailResult | null>;

  /** Returns true if an account with the given email already exists. */
  existsByEmail(email: string): Promise<boolean>;

  /** Paginated list of all accounts with optional filtering and sorting. */
  findAll(query: FindAllAccountsQuery): Promise<FindAllAccountsResult>;
}
