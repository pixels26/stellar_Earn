import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshToken } from './entities/refresh-token.entity';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),
    JwtModule.registerAsync({
       imports: [ConfigModule],
       useFactory: async (configService: ConfigService) => {
         const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
         if (!privateKey) {
           throw new Error('JWT_PRIVATE_KEY is not defined in environment variables');
         }
         return {
           privateKey,
           signOptions: {
             expiresIn: configService.get<string>(
               'JWT_ACCESS_TOKEN_EXPIRATION',
               '15m',
             ),
             algorithm: 'RS256',
           },
         } as any;
       },
       inject: [ConfigService],
     }),
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}