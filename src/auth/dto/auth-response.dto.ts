import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class AuthResponseDto {
  @ApiProperty({ example: true, description: 'Succès de l\'opération' })
  success: boolean;

  @ApiProperty({ example: 'Connexion réussie', description: 'Message de retour' })
  message: string;

  @ApiPropertyOptional({
    description: 'Informations utilisateur',
    example: {
      id: 1,
      username: 'john_doe',
      email: 'john@example.com',
      role: UserRole.STUDENT,
      isActive: true,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    },
  })
  user?: any;

  @ApiPropertyOptional({
    description: 'Tokens JWT',
    example: {
      accessToken: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      expiresIn: 900,
    },
  })
  tokens?: any;

  @ApiPropertyOptional({ example: '2024-07-18T10:00:00.000Z', description: 'Horodatage' })
  timestamp?: string;
}