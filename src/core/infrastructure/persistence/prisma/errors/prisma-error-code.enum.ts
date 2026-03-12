export const PrismaErrorCode = {
  UNIQUE_CONSTRAINT_VIOLATION: 'P2002',
  FOREIGN_KEY_CONSTRAINT_VIOLATION: 'P2003',
  INVALID_QUERY_ARGUMENT: 'P2005',
  RECORD_NOT_FOUND: 'P2025',
} as const;

export type PrismaErrorCode = (typeof PrismaErrorCode)[keyof typeof PrismaErrorCode]; 