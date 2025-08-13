import { IsString, IsEmail, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email ou nom d\'utilisateur' })
  identifier: string; // Peut être email ou username

  @ApiProperty({ example: 'password123', description: 'Mot de passe' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: true, description: 'Se souvenir de la session ?' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean = false;
}