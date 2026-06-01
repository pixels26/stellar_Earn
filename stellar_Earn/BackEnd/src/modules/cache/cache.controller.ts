import { Controller, Get, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CacheService } from './cache.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Cache')
@Controller('cache')
@UseGuards(JwtAuthGuard)
export class CacheController {
  constructor(private cacheService: CacheService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved' })
  async getStats(@Query('key') key?: string) {
    return this.cacheService.getStats(key);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear all cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  async clearCache() {
    await this.cacheService.clear();
    return { message: 'Cache cleared successfully' };
  }

  @Delete('clear-pattern')
  @ApiOperation({ summary: 'Clear cache by pattern' })
  @ApiResponse({ status: 200, description: 'Cache pattern cleared' })
  async clearCachePattern(@Query('pattern') pattern: string) {
    if (!pattern) {
      throw new Error('Pattern is required');
    }
    await this.cacheService.deletePattern(pattern);
    return { message: `Cache pattern "${pattern}" cleared successfully` };
  }

  @Delete('reset-stats')
  @ApiOperation({ summary: 'Reset cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics reset' })
  async resetStats() {
    this.cacheService.resetStats();
    return { message: 'Cache statistics reset successfully' };
  }
}
