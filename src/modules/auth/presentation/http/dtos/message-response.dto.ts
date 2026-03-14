import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Human-readable operation result message.',
    example: 'Operation completed successfully.',
  })
  message: string;

  constructor(partial: Partial<MessageResponseDto>) {
    Object.assign(this, partial);
  }
}
