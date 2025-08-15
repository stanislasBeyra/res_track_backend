import { IsNotEmpty, IsEnum, IsOptional, IsString, IsBoolean, IsDateString, IsNumber } from 'class-validator';
import { AbsenceReason } from '../entities/absence.entity';

export class CreateAbsenceDto {
  @IsNotEmpty()
  @IsNumber()
  studentId: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsEnum(AbsenceReason)
  reason: AbsenceReason;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  justified?: boolean;

  @IsOptional()
  @IsString()
  justificationDocument?: string;

  @IsOptional()
  @IsNumber()
  verifiedBy?: number;
}