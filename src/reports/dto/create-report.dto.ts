import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsObject } from 'class-validator';
import { ReportType, ReportFormat } from '../entities/report.entity';

export class CreateReportDto {
  @ApiProperty({ description: 'Titre du rapport' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description du rapport', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ReportType, description: 'Type de rapport' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ enum: ReportFormat, description: 'Format du rapport' })
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @ApiProperty({ description: 'Paramètres du rapport', required: false })
  @IsOptional()
  @IsObject()
  parameters?: any;

  @ApiProperty({ description: 'Date de début de période', required: false })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiProperty({ description: 'Date de fin de période', required: false })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiProperty({ description: 'ID de l\'utilisateur générateur' })
  @IsNumber()
  generatedBy: number;
}