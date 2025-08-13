import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-123', description: 'Token de réinitialisation' })
  token: string;

  @ApiProperty({ example: 'newPassword456', description: 'Nouveau mot de passe' })
  newPassword: string;
}