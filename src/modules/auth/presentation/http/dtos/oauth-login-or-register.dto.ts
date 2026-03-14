import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthProvider } from 'src/modules/auth/domain/enums/auth-provider.enum';

export class OAuthLoginOrRegisterDto {
  @ApiProperty({
    description: 'OAuth provider name.',
    example: AuthProvider.GOOGLE,
    enum: AuthProvider,
  })
  @IsEnum(AuthProvider)
  provider: AuthProvider;

  @ApiProperty({
    description: 'Unique user id from OAuth provider.',
    example: 'google-oauth2|112233445566778899001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  providerId: string;

  @ApiPropertyOptional({
    description: 'Email from OAuth provider. Required for account provisioning in this implementation.',
    example: 'user@example.com',
  })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiProperty({
    description: 'Display name from OAuth provider profile.',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({
    description: 'Avatar URL from OAuth provider profile.',
    example: 'https://lh3.googleusercontent.com/a/default-user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  avatarUrl?: string | null;
}
