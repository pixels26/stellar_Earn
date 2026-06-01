import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostmortemEntity } from './postmortem.entity';
import { PostmortemService } from './postmortem.service';
import { PostmortemController } from './postmortem.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PostmortemEntity])],
  providers: [PostmortemService],
  controllers: [PostmortemController],
  exports: [PostmortemService],
})
export class PostmortemModule {}
