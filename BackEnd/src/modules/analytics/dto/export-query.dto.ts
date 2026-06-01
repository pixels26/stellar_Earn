import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  JSONL = 'jsonl',
}

export class ExportQueryDto {
  @ApiProperty({
    description: 'Export format (csv, json, or jsonl)',
    enum: ExportFormat,
    default: ExportFormat.CSV,
  })
  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat = ExportFormat.CSV;

  @ApiProperty({
    description: 'Start date for filtering data (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'End date for filtering data (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
