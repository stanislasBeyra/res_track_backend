import { IsString, IsEnum, IsOptional, IsNumber, IsArray, MinLength, MaxLength } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiPropertyOptional({ example: 1, description: 'ID utilisateur cible' })
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ example: [1, 2, 3], description: 'IDs de plusieurs utilisateurs' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  userIds?: number[];

  @ApiProperty({ example: 'Nouvelle notification', description: 'Titre' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Ceci est le contenu de la notification.', description: 'Message' })
  @IsString()
  @MinLength(10)
  message: string;

  @ApiPropertyOptional({ enum: NotificationType, example: NotificationType.INFO, description: 'Type de notification' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
