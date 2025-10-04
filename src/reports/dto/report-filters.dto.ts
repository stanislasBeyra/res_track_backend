import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString, IsNumber, IsString } from 'class-validator';
import { ReportType, ReportFormat, ReportStatus } from '../entities/report.entity';

export class ReportFiltersDto {
  @ApiProperty({ required: false, description: 'ID de l\'étudiant' })
  @IsOptional()
  @IsNumber()
  studentId?: number;

  @ApiProperty({ required: false, description: 'ID du cours' })
  @IsOptional()
  @IsNumber()
  courseId?: number;

  @ApiProperty({ required: false, description: 'ID du générateur' })
  @IsOptional()
  @IsNumber()
  generatedBy?: number;

  @ApiProperty({ enum: ReportType, required: false })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiProperty({ enum: ReportFormat, required: false })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiProperty({ enum: ReportStatus, required: false })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiProperty({ required: false, description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, description: 'Recherche textuelle' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Page', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Limite par page', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @ApiProperty({ required: false, description: 'Tri par', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, description: 'Ordre de tri', default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}