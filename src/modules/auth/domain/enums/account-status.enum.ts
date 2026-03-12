export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
} as const;

export type AccountStatus = typeof AccountStatus[keyof typeof AccountStatus];
