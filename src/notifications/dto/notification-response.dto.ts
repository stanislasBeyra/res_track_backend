import { NotificationType } from '../entities/notification.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: 1, description: 'ID de la notification' })
  id: number;

  @ApiProperty({ example: 1, description: 'ID de l\'utilisateur concerné' })
  userId: number;

  @ApiProperty({ example: 'Titre de la notification', description: 'Titre' })
  title: string;

  @ApiProperty({ example: 'Ceci est le contenu de la notification.', description: 'Message' })
  message: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.INFO, description: 'Type de notification' })
  type: NotificationType;

  @ApiProperty({ example: false, description: 'Notification lue ?' })
  isRead: boolean;

  @ApiProperty({ example: '2024-07-18T10:00:00.000Z', description: 'Date de création' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2024-07-18T12:00:00.000Z', description: 'Date de lecture' })
  readAt?: Date;

  @ApiPropertyOptional({
    description: 'Informations sur l\'utilisateur',
    example: {
      id: 1,
      username: 'john_doe',
      email: 'john@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
      },
    },
  })
  user?: {
    id: number;
    username: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
} 