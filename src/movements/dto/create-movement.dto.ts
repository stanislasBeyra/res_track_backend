import { IsEnum, IsNotEmpty, IsString, IsOptional, IsInt, MaxLength } from 'class-validator';
import { MovementType, MovementMethod } from '../entities/movement.entity';

export class CreateMovementDto {
  @IsInt()
  @IsOptional()
  studentId?: number; // Optionnel si on utilise un code

  @IsString()
  @IsOptional()
  exitCode?: string; // Code de sortie pour vérifier la permission

  @IsEnum(MovementType)
  @IsNotEmpty()
  type: MovementType;

  @IsEnum(MovementMethod)
  @IsOptional()
  method?: MovementMethod;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
