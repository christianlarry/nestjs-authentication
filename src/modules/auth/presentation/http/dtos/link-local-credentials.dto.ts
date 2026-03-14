import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class LinkLocalCredentialsDto {
  @ApiProperty({
    description: 'New local password to attach to account.',
    example: 'Str0ngP@sswordForLocal!',
  })
  @IsString()
  @IsStrongPassword({}, { message: 'password must be strong.' })
  @IsNotEmpty()
  password: string;
}
