import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123', description: 'Mot de passe actuel' })
  currentPassword: string;

  @ApiProperty({ example: 'newPassword456', description: 'Nouveau mot de passe' })
  newPassword: string;
}