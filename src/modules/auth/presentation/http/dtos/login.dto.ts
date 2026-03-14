import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: 'The email address of the user.',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase().trim()) // Normalize email input
  email: string;

  @ApiProperty({
    description: 'The password of the user.',
    example: 'password123'
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}