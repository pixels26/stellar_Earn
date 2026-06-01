import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ExecutionTraceModule } from '../../../BackEnd/src/modules/trace/execution-trace.module';

@Module({
  imports: [ExecutionTraceModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}