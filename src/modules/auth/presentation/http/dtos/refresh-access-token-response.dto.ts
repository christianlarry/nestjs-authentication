import { ApiProperty } from '@nestjs/swagger';

export class RefreshAccessTokenResponseDto {
  @ApiProperty({
    description: 'Authenticated account id.',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  accountId: string;

  @ApiProperty({
    description: 'New access token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new-access',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Rotated refresh token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new-refresh',
  })
  refreshToken: string;

  constructor(partial: Partial<RefreshAccessTokenResponseDto>) {
    Object.assign(this, partial);
  }
}
