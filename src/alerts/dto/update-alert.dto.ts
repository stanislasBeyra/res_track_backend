import { PartialType } from '@nestjs/mapped-types';
import { CreateAlertDto } from './create-alert.dto';
import { IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAlertDto extends PartialType(CreateAlertDto) {
  @ApiPropertyOptional({ example: true, description: 'Alerte résolue ?' })
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional({ example: 2, description: 'ID du résolveur' })
  @IsOptional()
  @IsNumber()
  resolvedBy?: number;
}
