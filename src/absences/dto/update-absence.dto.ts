import { PartialType } from '@nestjs/mapped-types';
import { CreateAbsenceDto } from './create-absence.dto';
import { IsOptional, IsBoolean, IsNumber, IsDateString } from 'class-validator';

export class UpdateAbsenceDto extends PartialType(CreateAbsenceDto) {
  @IsOptional()
  @IsBoolean()
  justified?: boolean;

  @IsOptional()
  @IsDateString()
  verifiedAt?: string;

  @IsOptional()
  @IsNumber()
  verifiedBy?: number;
}
