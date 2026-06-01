import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService, AuthUser } from '../auth.service';

export interface JwtPayload {
  sub: string;
  stellarAddress: string;
  role: string;
}

const ACCESS_TOKEN_COOKIE = 'auth_token';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.trim().split('=');
    const name = parts[0];
    if (name) {
      cookies[name] = parts.slice(1).join('=');
    }
  });
  return cookies;
}

function extractJwtFromCookie(req: Request): string | null {
  if (!req || !req.headers) {
    return null;
  }
  const cookies = parseCookies(req.headers.cookie as string);
  return cookies[ACCESS_TOKEN_COOKIE] || null;
}

@Injectable()
export class JwtStrategy extends Strategy {
   constructor(
     private readonly configService: ConfigService,
     private readonly authService: AuthService,
   ) {
     const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
     if (!publicKey) {
       throw new Error('JWT_PUBLIC_KEY is not defined in environment variables');
     }

     super({
       jwtFromRequest: (req) => {
         const fromCookie = extractJwtFromCookie(req);
         if (fromCookie) {
           return fromCookie;
         }
         return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
       },
       ignoreExpiration: false,
       secretOrKey: publicKey,
     }, async (payload: JwtPayload) => {
       return this.authService.validate(payload.stellarAddress);
     });
   }


}
