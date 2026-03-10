/**
 * Constants untuk BullMQ mail queue
 */
export const MAIL_QUEUE_NAME = 'mail-queue';

/**
 * Job options constants
 */
export const MAIL_JOB_OPTIONS = {
  /**
   * Number of retry attempts for failed jobs
   */
  MAX_ATTEMPTS: 3,

  /**
   * Backoff delay in milliseconds for retries
   */
  BACKOFF_DELAY: 5000, // 5 seconds

  /**
   * Backoff type: 'fixed' | 'exponential'
   */
  BACKOFF_TYPE: 'exponential' as const,

  /**
   * Remove job on complete
   */
  REMOVE_ON_COMPLETE: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 1000, // Keep last 1000 completed jobs
  },

  /**
   * Remove job on fail
   */
  REMOVE_ON_FAIL: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
} as const;

/**
 * Queue configuration constants
 */
export const MAIL_QUEUE_CONFIG = {
  /**
   * Default job concurrency
   */
  CONCURRENCY: 5,

  /**
   * Rate limiter settings
   */
  RATE_LIMITER: {
    max: 10, // Maximum 10 emails
    duration: 1000, // Per 1 second
  },
} as const;
