import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { RegisterUseCase } from "../../application/use-cases/register.usecase";
import { Throttle } from "@nestjs/throttler";
import { THROTTLE_LIMITS } from "src/core/http/rate-limit/throttle.limit";
import { THROTTLE_TTL } from "src/core/http/rate-limit/throttle.ttl";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { RegisterDto } from "./dtos/register.dto";
import { RegisterResponseDto } from "./dtos/register-response.dto";

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase
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
} 