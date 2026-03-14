import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AuthProvider } from 'src/modules/auth/domain/enums/auth-provider.enum';

export class LinkOAuthProviderDto {
  @ApiProperty({
    description: 'OAuth provider name.',
    example: AuthProvider.GOOGLE,
    enum: AuthProvider,
  })
  @IsEnum(AuthProvider)
  provider: AuthProvider;

  @ApiProperty({
    description: 'Unique provider user id.',
    example: 'google-oauth2|112233445566778899001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  providerId: string;
}
