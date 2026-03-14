import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class VerifyEmailDto {
  @ApiProperty({
    description: 'The email verification token sent to the user\'s email address.',
    example: 'abc123def456ghi789jkl012mno345pqrs',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}