import { AlertType } from '../entities/alert.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AlertResponseDto {
  @ApiProperty({ example: 1, description: 'ID de l\'alerte' })
  id: number;

  @ApiProperty({ example: 1, description: 'ID de l\'étudiant concerné' })
  studentId: number;

  @ApiProperty({ enum: AlertType, example: AlertType.ABSENCE, description: 'Type d\'alerte' })
  type: AlertType;

  @ApiProperty({ example: 'L\'étudiant était absent ce matin.', description: 'Message de l\'alerte' })
  message: string;

  @ApiProperty({ example: false, description: 'Alerte résolue ?' })
  resolved: boolean;

  @ApiProperty({ example: '2024-07-18T10:00:00.000Z', description: 'Date de création' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2024-07-18T12:00:00.000Z', description: 'Date de résolution' })
  resolvedAt?: Date;

  @ApiPropertyOptional({ example: 2, description: 'ID du résolveur' })
  resolvedBy?: number;

  @ApiPropertyOptional({
    description: 'Informations sur l\'étudiant',
    example: {
      id: 1,
      studentNumber: 'STU20240001',
      class: '3A',
      user: {
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    },
  })
  student?: {
    id: number;
    studentNumber: string;
    class: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };

  @ApiPropertyOptional({
    description: 'Informations sur le résolveur',
    example: {
      id: 2,
      username: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User',
      },
    },
  })
  resolver?: {
    id: number;
    username: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}