import { IsBoolean, IsString, IsOptional, MaxLength } from 'class-validator';

export class ApproveExitPermissionDto {
  @IsBoolean()
  approved: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;
}
