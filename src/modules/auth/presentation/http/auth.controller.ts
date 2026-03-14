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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase
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
  async resendVerificationEmail(email: string): Promise<void> {

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
} 