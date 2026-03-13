import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, Matches, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, { message: 'name must be at least 3 characters long' })
  @MaxLength(100, { message: 'name must be at most 100 characters long' })
  @Matches(/^[a-zA-Zà-žÀ-Ž'´`-]{3,}([ ][a-zA-Zà-žÀ-Ž'´`-]{1,})*$/, { message: 'name contains invalid characters or format' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the user. Must be a valid email format.',
  })
  @Transform((val) => val.value?.toLowerCase()?.trim()) // Normalize email
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd123!',
    description: 'Password for the user account. Must contain at least 8 characters, including uppercase, lowercase, number, and special character.',
    minLength: 8,
  })
  @IsString()
  @IsStrongPassword({}, { message: 'password must be at least 8 characters long and include uppercase, lowercase, number, and special character' })
  @IsNotEmpty()
  password: string;
}