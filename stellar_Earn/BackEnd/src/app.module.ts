import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLoggerService } from './common/logger/logger.service';
import { SecurityMiddleware } from './common/middleware/security.middleware';

import { AuthModule } from './modules/auth/auth.module';
import { dataSourceOptions } from './database/data-source';

import { ExecutionTraceModule } from './modules/trace/execution-trace.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { TraceInterceptor } from './modules/trace/trace.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AuthModule,
    ExecutionTraceModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppLoggerService,
    SecurityMiddleware,
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceInterceptor,
    },
  ],
})
export class AppModule {}