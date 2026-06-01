import {
  Controller,
  Get,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Minimal Jobs Controller
 * Only implements essential endpoints for server startup
 */
@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  /**
   * Health check endpoint
   */
  @Get('health')
  @ApiOperation({ summary: 'Job system health check' })
  @ApiResponse({ status: 200, description: 'Job system is healthy' })
  async health() {
    return {
      status: 'ok',
      message: 'Job system is operational',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Basic info endpoint
   */
  @Get()
  @ApiOperation({ summary: 'Get job system info' })
  @ApiResponse({ status: 200, description: 'Job system information' })
  async info() {
    return {
      status: 'operational',
      version: '1.0.0',
      features: [
        'job scheduling',
        'queue management',
        'monitoring'
      ],
      timestamp: new Date().toISOString(),
    };
  }
}