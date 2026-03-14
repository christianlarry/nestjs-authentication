import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { RegisterUseCase } from "../../application/use-cases/register.usecase";
import { Throttle } from "@nestjs/throttler";
import { THROTTLE_LIMITS } from "src/core/http/rate-limit/throttle.limit";
import { THROTTLE_TTL } from "src/core/http/rate-limit/throttle.ttl";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { RegisterDto } from "./dtos/register.dto";
import { RegisterResponseDto } from "./dtos/register-response.dto";
import { VerifyEmailDto } from "./dtos/verify-email.dto";
import { VerifyEmailUseCase } from "../../application/use-cases/verify-email.usecase";
import { LoginUseCase } from "../../application/use-cases/login.usecase";
import { LoginDto } from "./dtos/login.dto";
import { LoginResponseDto } from "./dtos/login-response.dto";
import { ResendVerificationEmailUseCase } from "../../application/use-cases/resend-verification-email.usecase";
import { ResendVerificationEmailDto } from "./dtos/resend-verification-email.dto";
import { OAuthLoginOrRegisterUseCase } from "../../application/use-cases/oauth-login-or-register.usecase";
import { OAuthLoginOrRegisterDto } from "./dtos/oauth-login-or-register.dto";
import { OAuthLoginOrRegisterResponseDto } from "./dtos/oauth-login-or-register-response.dto";
import { RefreshAccessTokenUseCase } from "../../application/use-cases/refresh-access-token.usecase";
import { RefreshAccessTokenDto } from "./dtos/refresh-access-token.dto";
import { RefreshAccessTokenResponseDto } from "./dtos/refresh-access-token-response.dto";
import { LogoutUseCase } from "../../application/use-cases/logout.usecase";
import { LogoutDto } from "./dtos/logout.dto";
import { MessageResponseDto } from "./dtos/message-response.dto";
import { ForgotPasswordUseCase } from "../../application/use-cases/forgot-password.usecase";
import { ForgotPasswordDto } from "./dtos/forgot-password.dto";
import { ResetPasswordUseCase } from "../../application/use-cases/reset-password.usecase";
import { ResetPasswordDto } from "./dtos/reset-password.dto";
import { ChangePasswordUseCase } from "../../application/use-cases/change-password.usecase";
import { ChangePasswordDto } from "./dtos/change-password.dto";
import { LinkOAuthProviderUseCase } from "../../application/use-cases/link-oauth-provider.usecase";
import { LinkOAuthProviderDto } from "./dtos/link-oauth-provider.dto";
import { UnlinkOAuthProviderUseCase } from "../../application/use-cases/unlink-oauth-provider.usecase";
import { UnlinkOAuthProviderDto } from "./dtos/unlink-oauth-provider.dto";
import { LinkLocalCredentialsUseCase } from "../../application/use-cases/link-local-credentials.usecase";
import { LinkLocalCredentialsDto } from "./dtos/link-local-credentials.dto";

// TODO(auth-guard): Enable guard imports once auth strategy/guard is implemented.
// import { UseGuards } from "@nestjs/common";
// import { JwtAuthGuard } from "../../infrastructure/guards/jwt-auth.guard";

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly resendVerificationEmailUseCase: ResendVerificationEmailUseCase,
    private readonly oauthLoginOrRegisterUseCase: OAuthLoginOrRegisterUseCase,
    private readonly refreshAccessTokenUseCase: RefreshAccessTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly linkOAuthProviderUseCase: LinkOAuthProviderUseCase,
    private readonly unlinkOAuthProviderUseCase: UnlinkOAuthProviderUseCase,
    private readonly linkLocalCredentialsUseCase: LinkLocalCredentialsUseCase,
  ) { }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: THROTTLE_LIMITS.STRICT, ttl: THROTTLE_TTL.FIFTEEN_MINUTES } }) // 5 requests per 15 minutes
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account with email and password. Sends a verification email to activate the account.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. Verification email sent.',
    type: RegisterDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid input data or validation failed.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - email already in use.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded.',
  })
  async register(
    @Body() registerDto: RegisterDto
  ): Promise<RegisterResponseDto> {
    const result = await this.registerUseCase.execute({
      name: registerDto.name,
      credentials: {
        email: registerDto.email,
        password: registerDto.password,
      },
    });
    return new RegisterResponseDto({
      newAccountId: result.newAccountId,
      message: 'Registration successful. Please check your email to verify your account.',
    });
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.MODERATE, ttl: THROTTLE_TTL.ONE_MINUTE } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verifies the user\'s email address using the token sent in the verification email.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully. Account activated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid or expired token.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded.',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<void> {
    await this.verifyEmailUseCase.execute({
      token: verifyEmailDto.token,
    });
  }

  @Post('resend-verification-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.VERY_STRICT, ttl: THROTTLE_TTL.ONE_HOUR } })
  @ApiOperation({
    summary: 'Resend Verification Email',
    description: 'Sends a new verification email to the user\'s email address.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid email address.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded.',
  })
  async resendVerificationEmail(
    @Body() dto: ResendVerificationEmailDto
  ): Promise<MessageResponseDto> {
    await this.resendVerificationEmailUseCase.execute({ email: dto.email });

    return new MessageResponseDto({
      message: 'If the account exists and is pending verification, a verification email has been sent.',
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.STRICT, ttl: THROTTLE_TTL.FIFTEEN_MINUTES } }) // 5 requests per 15 minutes
  @ApiOperation({
    summary: 'User Login',
    description: 'Authenticates a user with their email and password.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid email or password.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded.',
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const result = await this.loginUseCase.execute({
      email: loginDto.email,
      password: loginDto.password,
    });
    return new LoginResponseDto({
      accountId: result.accountId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  @Post('oauth/login-or-register')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.MODERATE, ttl: THROTTLE_TTL.FIVE_MINUTES } })
  @ApiOperation({
    summary: 'OAuth Login / Register',
    description: 'Creates or logs in an account using OAuth provider identity payload.',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth login/register completed successfully.',
    type: OAuthLoginOrRegisterResponseDto,
  })
  async oauthLoginOrRegister(
    @Body() dto: OAuthLoginOrRegisterDto
  ): Promise<OAuthLoginOrRegisterResponseDto> {
    const result = await this.oauthLoginOrRegisterUseCase.execute({
      provider: dto.provider,
      providerId: dto.providerId,
      email: dto.email ?? null,
      fullName: dto.fullName,
      avatarUrl: dto.avatarUrl ?? null,
    });

    return new OAuthLoginOrRegisterResponseDto(result);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.MODERATE, ttl: THROTTLE_TTL.ONE_MINUTE } })
  @ApiOperation({
    summary: 'Refresh Access Token',
    description: 'Rotates refresh token and issues a new access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refresh succeeded.',
    type: RefreshAccessTokenResponseDto,
  })
  async refreshAccessToken(
    @Body() dto: RefreshAccessTokenDto
  ): Promise<RefreshAccessTokenResponseDto> {
    const result = await this.refreshAccessTokenUseCase.execute({
      refreshToken: dto.refreshToken,
    });

    return new RefreshAccessTokenResponseDto(result);
  }

  @Post('logout')
  // TODO(auth-guard): protect this route with JWT guard when available.
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.LENIENT, ttl: THROTTLE_TTL.ONE_MINUTE } })
  @ApiOperation({
    summary: 'Logout',
    description: 'Revokes refresh token and blacklists access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout completed successfully.',
    type: MessageResponseDto,
  })
  async logout(@Body() dto: LogoutDto): Promise<MessageResponseDto> {
    await this.logoutUseCase.execute({
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
    });

    return new MessageResponseDto({
      message: 'Logout successful.',
    });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.VERY_STRICT, ttl: THROTTLE_TTL.ONE_HOUR } })
  @ApiOperation({
    summary: 'Forgot Password',
    description: 'Requests a password reset email for an account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Request processed.',
    type: MessageResponseDto,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    await this.forgotPasswordUseCase.execute({
      email: dto.email,
    });

    return new MessageResponseDto({
      message: 'If the account exists, a password reset email has been sent.',
    });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.STRICT, ttl: THROTTLE_TTL.FIFTEEN_MINUTES } })
  @ApiOperation({
    summary: 'Reset Password',
    description: 'Resets account password using a valid reset token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password has been reset.',
    type: MessageResponseDto,
  })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    await this.resetPasswordUseCase.execute({
      token: dto.token,
      newPassword: dto.newPassword,
    });

    return new MessageResponseDto({
      message: 'Password reset successful.',
    });
  }

  @Post('change-password')
  // TODO(auth-guard): protect this route with JWT guard when available.
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.STRICT, ttl: THROTTLE_TTL.FIFTEEN_MINUTES } })
  @ApiOperation({
    summary: 'Change Password',
    description: 'Changes password for an authenticated account id payload.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully.',
    type: MessageResponseDto,
  })
  async changePassword(
    @Body('accountId') accountId: string,
    @Body() dto: ChangePasswordDto
  ): Promise<MessageResponseDto> {
    await this.changePasswordUseCase.execute({
      accountId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });

    return new MessageResponseDto({
      message: 'Password changed successfully.',
    });
  }

  @Post('link-provider')
  // TODO(auth-guard): protect this route with JWT guard when available.
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.MODERATE, ttl: THROTTLE_TTL.FIVE_MINUTES } })
  @ApiOperation({
    summary: 'Link OAuth Provider',
    description: 'Links an OAuth provider to an existing account.',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth provider linked successfully.',
    type: MessageResponseDto,
  })
  async linkOAuthProvider(
    @Body('accountId') accountId: string,
    @Body() dto: LinkOAuthProviderDto
  ): Promise<MessageResponseDto> {
    await this.linkOAuthProviderUseCase.execute({
      accountId,
      provider: dto.provider,
      providerId: dto.providerId,
    });

    return new MessageResponseDto({
      message: 'OAuth provider linked successfully.',
    });
  }

  @Post('unlink-provider')
  // TODO(auth-guard): protect this route with JWT guard when available.
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.MODERATE, ttl: THROTTLE_TTL.FIVE_MINUTES } })
  @ApiOperation({
    summary: 'Unlink OAuth Provider',
    description: 'Unlinks an OAuth provider from an account.',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth provider unlinked successfully.',
    type: MessageResponseDto,
  })
  async unlinkOAuthProvider(
    @Body('accountId') accountId: string,
    @Body() dto: UnlinkOAuthProviderDto
  ): Promise<MessageResponseDto> {
    await this.unlinkOAuthProviderUseCase.execute({
      accountId,
      provider: dto.provider,
    });

    return new MessageResponseDto({
      message: 'OAuth provider unlinked successfully.',
    });
  }

  @Post('link-local')
  // TODO(auth-guard): protect this route with JWT guard when available.
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: THROTTLE_LIMITS.STRICT, ttl: THROTTLE_TTL.FIFTEEN_MINUTES } })
  @ApiOperation({
    summary: 'Link Local Credentials',
    description: 'Sets a local password for an OAuth-only account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Local credentials linked successfully.',
    type: MessageResponseDto,
  })
  async linkLocalCredentials(
    @Body('accountId') accountId: string,
    @Body() dto: LinkLocalCredentialsDto
  ): Promise<MessageResponseDto> {
    await this.linkLocalCredentialsUseCase.execute({
      accountId,
      password: dto.password,
    });

    return new MessageResponseDto({
      message: 'Local credentials linked successfully.',
    });
  }
} 