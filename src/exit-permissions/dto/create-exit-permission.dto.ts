import { IsEnum, IsNotEmpty, IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';
import { ExitReason } from '../entities/exit-permission.entity';

export class CreateExitPermissionDto {
  @IsEnum(ExitReason)
  @IsNotEmpty()
  reason: ExitReason;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}
