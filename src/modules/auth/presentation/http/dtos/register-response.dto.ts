import { ApiProperty } from "@nestjs/swagger";

export class RegisterResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier of the registered user',
  })
  newAccountId: string;

  @ApiProperty({
    example: 'Registration successful. Please check your email to verify your account.',
    description: 'Success message',
  })
  message: string;

  constructor(data: RegisterResponseDto) {
    Object.assign(this, data);
  }
}