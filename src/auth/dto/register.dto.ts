import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'john_doe', description: 'Nom d\'utilisateur' })
  username: string;

  @ApiProperty({ example: 'john@example.com', description: 'Adresse email' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'Mot de passe' })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.STUDENT, description: 'Rôle de l\'utilisateur' })
  role: UserRole;

  @ApiProperty({ example: 'John', description: 'Prénom' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Nom de famille' })
  lastName: string;
}