/**
 * Enum untuk tipe-tipe email job yang ada di sistem
 * Berdasarkan authentication flow dan kebutuhan aplikasi
 */
export const MailJobType = {
  /**
   * Email verifikasi akun setelah registrasi
   * Template: verification-email.hbs
   */
  VERIFICATION_EMAIL: 'verification-email',

  /**
   * Email untuk reset password (forgot password flow)
   * Template: reset-password.hbs
   */
  RESET_PASSWORD: 'reset-password',

  /**
   * Email konfirmasi setelah password berhasil diubah
   * Template: password-changed.hbs
   */
  PASSWORD_CHANGED: 'password-changed',

  /**
   * Email welcome setelah verifikasi berhasil
   * Template: welcome.hbs
   */
  WELCOME: 'welcome',

  /**
   * Email notifikasi login dari perangkat baru (optional)
   * Template: new-login.hbs
   */
  NEW_LOGIN_NOTIFICATION: 'new-login-notification',

  /**
   * Email alert untuk aktivitas mencurigakan (optional)
   * Template: suspicious-activity.hbs
   */
  SUSPICIOUS_ACTIVITY: 'suspicious-activity',
} as const;
export type MailJobType = typeof MailJobType[keyof typeof MailJobType];

/**
 * Priority level untuk email jobs
 */
export const MailJobPriority = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;
export type MailJobPriority = typeof MailJobPriority[keyof typeof MailJobPriority];
