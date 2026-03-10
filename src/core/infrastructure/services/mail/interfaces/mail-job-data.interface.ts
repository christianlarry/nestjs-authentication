import { MailJobType } from '../enums/mail-job.enum';

/**
 * Base interface untuk mail job data
 */
export interface IMailJobData {
  to: string;
  subject: string;
  type: MailJobType;
  context: Record<string, any>;
}

/**
 * Data untuk verification email
 */
export interface IVerificationEmailData {
  to: string;
  name: string;
  token: string;
  verificationUrl?: string; // Generated automatically if not provided
  expiresIn?: string; // Default: "24 hours"
}

/**
 * Data untuk reset password email
 */
export interface IResetPasswordEmailData {
  to: string;
  name: string;
  token: string;
  resetUrl?: string; // Generated automatically if not provided
  expiresIn?: string; // Default: "1 hour"
}

/**
 * Data untuk password changed confirmation
 */
export interface IPasswordChangedEmailData {
  to: string;
  name: string;
  changedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Data untuk welcome email
 */
export interface IWelcomeEmailData {
  to: string;
  name: string;
}

/**
 * Data untuk new login notification
 */
export interface INewLoginNotificationData {
  to: string;
  name: string;
  loginAt: Date;
  ipAddress: string;
  location?: string;
  device: string;
}

/**
 * Data untuk suspicious activity alert
 */
export interface ISuspiciousActivityData {
  to: string;
  name: string;
  activityType: string;
  detectedAt: Date;
  ipAddress: string;
  location?: string;
  actionUrl?: string; // URL untuk secure account atau change password
}
