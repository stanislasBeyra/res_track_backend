import { IsEmail, IsString, IsEnum, IsOptional, MinLength, IsDateString, IsBoolean } from 'class-validator';
import { UserRole } from '../entities/user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john_doe', description: 'Nom d\'utilisateur' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'john@example.com', description: 'Adresse email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Mot de passe' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.STUDENT, description: 'Rôle de l\'utilisateur' })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ example: true, description: 'Utilisateur actif ?' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  // Informations de profil
  @ApiProperty({ example: 'John', description: 'Prénom' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Nom de famille' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiPropertyOptional({ example: '1990-01-01', description: 'Date de naissance (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '0123456789', description: 'Numéro de téléphone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '123 rue Principale', description: 'Adresse' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Paris', description: 'Ville' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '75000', description: 'Code postal' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'France', description: 'Pays' })
  @IsOptional()
  @IsString()
  country?: string;

  // Informations spécifiques aux étudiants
  @ApiPropertyOptional({ example: 'STU20240001', description: 'Numéro étudiant' })
  @IsOptional()
  @IsString()
  studentNumber?: string;

  @ApiPropertyOptional({ example: '3A', description: 'Classe' })
  @IsOptional()
  @IsString()
  class?: string;

  @ApiPropertyOptional({ example: '2024-09-01', description: 'Date d\'inscription (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;
}