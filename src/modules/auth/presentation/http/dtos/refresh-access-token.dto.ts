import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshAccessTokenDto {
  @ApiProperty({
    description: 'Refresh token used to issue a new access token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
