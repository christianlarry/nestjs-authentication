import { Module } from '@nestjs/common';
import { AuthController } from './presentation/http/auth.controller';

@Module({
  imports: [],
  controllers: [
    AuthController,
  ],
  providers: [],
})
export class AuthModule { }
