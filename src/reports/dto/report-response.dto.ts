import { ApiProperty } from '@nestjs/swagger';
import { ReportType, ReportFormat, ReportStatus } from '../entities/report.entity';

export class ReportResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ enum: ReportType })
  type: ReportType;

  @ApiProperty({ enum: ReportFormat })
  format: ReportFormat;

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @ApiProperty({ required: false })
  parameters?: any;

  @ApiProperty({ required: false })
  data?: any;

  @ApiProperty({ required: false })
  filePath?: string;

  @ApiProperty({ required: false })
  fileName?: string;

  @ApiProperty({ required: false })
  fileSize?: number;

  @ApiProperty({ required: false })
  periodStart?: Date;

  @ApiProperty({ required: false })
  periodEnd?: Date;

  @ApiProperty({ required: false })
  errorMessage?: string;

  @ApiProperty()
  generatedBy: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ required: false })
  generator?: {
    id: number;
    username: string;
    email: string;
  };
}