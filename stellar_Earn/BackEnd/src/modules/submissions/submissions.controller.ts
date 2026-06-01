import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubmissionsService } from './submissions.service';

@ApiTags('Submissions')
@Controller('quests/:questId/submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get submissions for a quest' })
  @ApiResponse({ status: 200, description: 'Submissions list returned' })
  async getQuestSubmissions() {
    return { success: true, data: [] };
  }
}