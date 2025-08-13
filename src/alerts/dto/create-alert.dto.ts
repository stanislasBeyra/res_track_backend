import { IsString, IsEnum, IsOptional, IsNumber, MinLength } from 'class-validator';
import { AlertType } from '../entities/alert.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAlertDto {
  @ApiProperty({ example: 1, description: 'ID de l\'étudiant concerné' })
  @IsNumber()
  studentId: number;

  @ApiProperty({ enum: AlertType, example: AlertType.ABSENCE, description: 'Type d\'alerte' })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({ example: 'L\'étudiant était absent ce matin.', description: 'Message de l\'alerte' })
  @IsString()
  @MinLength(10)
  message: string;

  @ApiPropertyOptional({ example: 2, description: 'ID de l\'utilisateur qui a résolu l\'alerte' })
  @IsOptional()
  @IsNumber()
  resolvedBy?: number;
}
