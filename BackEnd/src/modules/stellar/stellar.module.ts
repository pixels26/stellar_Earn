import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StellarService } from './stellar.service';
import { SorobanQuestReaderService } from './soroban-quest-reader.service';

@Module({
  imports: [ConfigModule],
  providers: [StellarService, SorobanQuestReaderService],
  exports: [StellarService, SorobanQuestReaderService],
})
export class StellarModule {}
