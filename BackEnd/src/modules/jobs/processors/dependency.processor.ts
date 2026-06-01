import { Injectable, Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DependencyFreshnessCheckPayload } from '../job.types';
import { DependencyFreshnessService } from '../../common/services/dependency-freshness.service';

@Injectable()
@Processor('maintenance')
export class DependencyProcessor {
  private readonly logger = new Logger(DependencyProcessor.name);

  constructor(
    private readonly dependencyFreshnessService: DependencyFreshnessService,
  ) {}

  @Process('dependency:freshness-check')
  async handleDependencyFreshnessCheck(
    job: Job<DependencyFreshnessCheckPayload>,
  ): Promise<void> {
    this.logger.log(
      `Processing dependency freshness check for ${job.data.repositoryOwner}/${job.data.repositoryName}`,
    );

    try {
      const result = await this.dependencyFreshnessService.checkAndReport(
        job.data.repositoryOwner,
        job.data.repositoryName,
        job.data.branch || 'main',
      );

      this.logger.log(
        `Dependency freshness check completed. Issue created: ${result.issueUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Dependency freshness check failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
