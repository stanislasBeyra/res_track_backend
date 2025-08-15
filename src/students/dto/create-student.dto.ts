import { IsNotEmpty, IsOptional, IsString, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { StudentStatus } from '../entities/student.entity';

export class CreateStudentDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsNotEmpty()
  @IsString()
  studentNumber: string;

  @IsNotEmpty()
  @IsString()
  class: string;

  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @IsNotEmpty()
  @IsDateString()
  enrollmentDate: string;

  @IsOptional()
  @IsDateString()
  graduationDate?: string;
}