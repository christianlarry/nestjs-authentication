import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, SendMailOptions, Transporter } from "nodemailer";
import { AllConfigType } from "src/config/config.type";
import * as fs from 'fs/promises';
import Handlebars from "handlebars";

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    // Initialize the transporter with configuration (omitted for brevity)
    this.transporter = createTransport({
      host: configService.get('mail.host', { infer: true }),
      port: configService.get('mail.port', { infer: true }),
      ignoreTLS: configService.get('mail.ignoreTLS', { infer: true }),
      secure: configService.get('mail.secure', { infer: true }),
      requireTLS: configService.get('mail.requireTLS', { infer: true }),
      auth: {
        user: configService.get('mail.user', { infer: true }),
        pass: configService.get('mail.password', { infer: true }),
      },
    });
  }

  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log('Mail transport is ready');
    } catch (error) {
      this.logger.error('Mail transport verification failed:', error);
      throw error;
    }
  }

  async sendMail({
    templatePath,
    context,
    ...mailOptions
  }: SendMailOptions & {
    templatePath: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    let html: string | undefined;
    if (templatePath) {
      const template = await fs.readFile(templatePath, 'utf-8');
      html = Handlebars.compile(template, {
        strict: true,
      })(context);
    }

    const defaultName = this.configService.get('mail.defaultName', { infer: true });
    const defaultEmail = this.configService.get('mail.defaultEmail', { infer: true });

    await this.transporter.sendMail({
      ...mailOptions,
      from: mailOptions.from
        ? mailOptions.from
        : `"${defaultName}" <${defaultEmail}>`,
      html: mailOptions.html ? mailOptions.html : html,
    });
  }
}