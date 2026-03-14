import { ApiProperty } from '@nestjs/swagger';

export class OAuthLoginOrRegisterResponseDto {
  @ApiProperty({
    description: 'Authenticated account id.',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  accountId: string;

  @ApiProperty({
    description: 'JWT access token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'True if account is newly created from OAuth login.',
    example: false,
  })
  isNewAccount: boolean;

  @ApiProperty({
    description: 'True if provider was newly linked during this request.',
    example: true,
  })
  providerLinked: boolean;

  constructor(partial: Partial<OAuthLoginOrRegisterResponseDto>) {
    Object.assign(this, partial);
  }
}
