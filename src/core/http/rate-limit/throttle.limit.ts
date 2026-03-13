export const THROTTLE_LIMITS = {
  VERY_STRICT: 3,     // For sensitive operations (email resend, forgot password)
  STRICT: 5,          // For authentication (login, register)
  MODERATE: 10,       // For token operations
  LENIENT: 20,        // For logout, less critical operations
  GENEROUS: 100,      // For general API endpoints
  UNLIMITED: 1000,    // For authenticated premium users
} as const;