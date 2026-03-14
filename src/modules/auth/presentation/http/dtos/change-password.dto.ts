import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current account password.',
    example: 'Curr3ntP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'New account password.',
    example: 'N3wStrongP@ssw0rd!',
  })
  @IsString()
  @IsStrongPassword({}, { message: 'newPassword must be strong.' })
  @IsNotEmpty()
  newPassword: string;
}
