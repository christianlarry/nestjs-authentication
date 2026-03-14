import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AuthProvider } from 'src/modules/auth/domain/enums/auth-provider.enum';

export class UnlinkOAuthProviderDto {
  @ApiProperty({
    description: 'OAuth provider to unlink.',
    example: AuthProvider.GOOGLE,
    enum: AuthProvider,
  })
  @IsEnum(AuthProvider)
  provider: AuthProvider;
}
