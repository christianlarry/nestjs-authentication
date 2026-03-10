import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { join } from 'path';
import { AllConfigType } from 'src/config/config.type';
import {
  IMailJobData,
  INewLoginNotificationData,
  IPasswordChangedEmailData,
  IResetPasswordEmailData,
  ISuspiciousActivityData,
  IVerificationEmailData,
  IWelcomeEmailData,
} from './interfaces/mail-job-data.interface';
import { MAIL_QUEUE_NAME } from './constants/mail-queue.constants';
import { MailerService } from '../../mailer/mailer.service';
import { MailJobType } from './enums/mail-job.enum';

/**
 * Mail Processor
 * Bertanggung jawab untuk memproses semua email jobs dari queue
 */
@Processor(MAIL_QUEUE_NAME, {
  concurrency: 5, // Process 5 jobs concurrently
  limiter: {
    max: 10, // Maximum 10 jobs
    duration: 1000, // Per 1 second
  },
})
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly templateBasePath = join(
    __dirname,
    '..',
    'mail',
    'templates',
  ); // How to use : join(this.templateBasePath, 'template-file.hbs')

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    super();
  }

  /**
   * Main process method untuk handle semua email jobs
   */
  async process(job: Job<IMailJobData>): Promise<void> {
    this.logger.log(
      `Processing email job ${job.id} of type ${job.data.type} to ${job.data.to}`,
    );

    try {
      switch (job.data.type) {
        case MailJobType.VERIFICATION_EMAIL:
          await this.sendVerificationEmail(job);
          break;

        case MailJobType.RESET_PASSWORD:
          await this.sendResetPasswordEmail(job);
          break;

        case MailJobType.PASSWORD_CHANGED:
          await this.sendPasswordChangedEmail(job);
          break;

        case MailJobType.WELCOME:
          await this.sendWelcomeEmail(job);
          break;

        case MailJobType.NEW_LOGIN_NOTIFICATION:
          await this.sendNewLoginNotification(job);
          break;

        case MailJobType.SUSPICIOUS_ACTIVITY:
          await this.sendSuspiciousActivityAlert(job);
          break;

        default:
          throw new Error(`Unknown mail job type: ${job.data.type}`);
      }

      this.logger.log(
        `Successfully sent ${job.data.type} email to ${job.data.to}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send ${job.data.type} email to ${job.data.to}`,
        error.stack,
      );
      throw error; // Re-throw untuk trigger retry mechanism
    }
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(
    job: Job<IMailJobData>,
  ): Promise<void> {
    const data = job.data.context as IVerificationEmailData;

    // Generate verification URL if not provided
    const frontendUrl = this.configService.get('app.frontendDomain', {
      infer: true,
    });
    const verificationUrl =
      data.verificationUrl ||
      `${frontendUrl}/auth/verify-email?token=${data.token}`;

    const templatePath = join(
      this.templateBasePath,
      'verification-email.hbs',
    );

    await this.mailerService.sendMail({
      to: data.to,
      subject: 'Verify your Keramik Store account',
      templatePath,
      context: {
        name: data.name,
        verificationUrl,
        expiresIn: data.expiresIn || `${this.configService.get('auth.verificationTokenExpirationHours', { infer: true })!} hours`,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send reset password email
   */
  private async sendResetPasswordEmail(
    job: Job<IMailJobData>,
  ): Promise<void> {
    const data = job.data.context as IResetPasswordEmailData;

    // Generate reset URL if not provided
    const frontendUrl = this.configService.get('app.frontendDomain', {
      infer: true,
    });
    const resetUrl =
      data.resetUrl || `${frontendUrl}/auth/reset-password?token=${data.token}`;

    const templatePath = join(
      this.templateBasePath,
      'reset-password.hbs',
    );

    await this.mailerService.sendMail({
      to: data.to,
      subject: 'Reset your Keramik Store password',
      templatePath,
      context: {
        name: data.name,
        resetUrl,
        expiresIn: data.expiresIn || `${this.configService.get('auth.forgotPasswordTokenExpirationHours', { infer: true })!} hours`,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send password changed confirmation email
   */
  private async sendPasswordChangedEmail(
    job: Job<IMailJobData>,
  ): Promise<void> {
    const data = job.data.context as IPasswordChangedEmailData;

    const templatePath = join(
      this.templateBasePath,
      'password-changed.hbs',
    );

    await this.mailerService.sendMail({
      to: data.to,
      subject: 'Your Keramik Store password has been changed',
      templatePath,
      context: {
        name: data.name,
        changedAt: data.changedAt.toLocaleString(),
        ipAddress: data.ipAddress || 'Unknown',
        userAgent: data.userAgent || 'Unknown',
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send welcome email
   */
  private async sendWelcomeEmail(job: Job<IMailJobData>): Promise<void> {
    const data = job.data.context as IWelcomeEmailData;

    const templatePath = join(
      this.templateBasePath,
      'welcome.hbs',
    );

    await this.mailerService.sendMail({
      to: data.to,
      subject: 'Welcome to Keramik Store!',
      templatePath,
      context: {
        year: new Date().getFullYear(),
        frontendUrl: this.configService.get('app.frontendDomain', { infer: true }) || 'https://keramikstore.com',
        email: data.to,
        name: data.name,
      },
    });
  }

  /**
   * Send new login notification
   */
  private async sendNewLoginNotification(
    job: Job<IMailJobData>,
  ): Promise<void> {
    const data = job.data.context as INewLoginNotificationData;

    const templatePath = join(
      this.templateBasePath,
      'new-login-notification.hbs',
    );

    await this.mailerService.sendMail({
      to: data.to,
      subject: 'New login to your Keramik Store account',
      templatePath,
      context: {
        name: data.name,
        loginAt: data.loginAt.toLocaleString(),
        ipAddress: data.ipAddress,
        location: data.location || 'Unknown',
        device: data.device,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send suspicious activity alert
   */
  private async sendSuspiciousActivityAlert(
    job: Job<IMailJobData>,
  ): Promise<void> {
    const data = job.data.context as ISuspiciousActivityData;

    const frontendUrl = this.configService.get('app.frontendDomain', {
      infer: true,
    });
    const actionUrl =
      data.actionUrl || `${frontendUrl}/auth/change-password`;

    const templatePath = join(
      this.templateBasePath,
      'suspicious-activity.hbs',
    );

    await this.mailerService.sendMail({
      to: data.to,
      subject: '🚨 Suspicious activity detected on your Keramik Store account',
      templatePath,
      context: {
        name: data.name,
        activityType: data.activityType,
        detectedAt: data.detectedAt.toLocaleString(),
        ipAddress: data.ipAddress,
        location: data.location || 'Unknown',
        actionUrl,
        year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Handle job completion
   */
  @OnWorkerEvent('completed')
  async onCompleted(job: Job<IMailJobData>): Promise<void> {
    this.logger.debug(
      `Email job ${job.id} completed successfully for ${job.data.to}`,
    );
  }

  /**
   * Handle job failure
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<IMailJobData>, error: Error): Promise<void> {
    this.logger.error(
      `Email job ${job.id} failed for ${job.data.to}. Attempt ${job.attemptsMade}/${job.opts.attempts || 1}`,
      error.stack,
    );

    // Jika sudah mencapai max attempts, log sebagai permanent failure
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
      this.logger.error(
        `Email job ${job.id} permanently failed after ${job.attemptsMade} attempts`,
      );
      // TODO: Implement alert mechanism (e.g., Sentry, Slack notification)
    }
  }

  /**
   * Handle job retry/stalled
   */
  @OnWorkerEvent('active')
  async onActive(job: Job<IMailJobData>): Promise<void> {
    this.logger.debug(
      `Email job ${job.id} is now active. Processing ${job.data.type} email to ${job.data.to}`,
    );
  }
}
