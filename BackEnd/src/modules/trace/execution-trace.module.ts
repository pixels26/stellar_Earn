import { Module } from '@nestjs/common';
import { ExecutionTraceService } from './execution-trace.service';
import { ExecutionTraceController } from './execution-trace.controller';

@Module({
  controllers: [ExecutionTraceController],
  providers: [ExecutionTraceService],
  exports: [ExecutionTraceService],
})
export class ExecutionTraceModule {}