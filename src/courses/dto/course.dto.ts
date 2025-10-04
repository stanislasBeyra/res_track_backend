import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsArray, IsNumber, Min, Max, Length, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { CourseStatus, CourseDifficulty } from '../entities/course.entity';

export class CreateCourseDto {
  @ApiProperty({ description: 'Titre du cours' })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional({ description: 'Description du cours' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Code du cours' })
  @IsString()
  @Length(1, 100)
  code: string;

  @ApiPropertyOptional({ enum: CourseStatus, description: 'Statut du cours' })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ enum: CourseDifficulty, description: 'Difficulté du cours' })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ description: 'Nombre de crédits', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  credits?: number;

  @ApiPropertyOptional({ description: 'Nombre maximum d\'étudiants', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;

  @ApiProperty({ description: 'Date de début (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Heure de début (HH:MM)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Heure de fin (HH:MM)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Horaire du cours' })
  @IsOptional()
  @IsArray()
  schedule?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
  }[];

  @ApiPropertyOptional({ description: 'Salle de cours' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ description: 'Prix du cours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Prérequis' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({ description: 'Objectifs du cours' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional({ description: 'Matériel requis' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @ApiPropertyOptional({ description: 'Programme détaillé' })
  @IsOptional()
  @IsString()
  syllabus?: string;

  @ApiPropertyOptional({ description: 'ID de l\'instructeur' })
  @IsOptional()
  @IsInt()
  instructor?: number;

  @ApiPropertyOptional({ description: 'Métadonnées additionnelles' })
  @IsOptional()
  metadata?: {
    category?: string;
    tags?: string[];
    language?: string;
    duration?: number;
    certificateEligible?: boolean;
  };
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: 'Titre du cours' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @ApiPropertyOptional({ description: 'Description du cours' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Code du cours' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  code?: string;

  @ApiPropertyOptional({ enum: CourseStatus, description: 'Statut du cours' })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ enum: CourseDifficulty, description: 'Difficulté du cours' })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ description: 'Nombre de crédits', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  credits?: number;

  @ApiPropertyOptional({ description: 'Nombre maximum d\'étudiants', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;

  @ApiPropertyOptional({ description: 'Date de début (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Heure de début (HH:MM)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Heure de fin (HH:MM)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Horaire du cours' })
  @IsOptional()
  @IsArray()
  schedule?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
  }[];

  @ApiPropertyOptional({ description: 'Salle de cours' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ description: 'Prix du cours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Prérequis' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({ description: 'Objectifs du cours' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional({ description: 'Matériel requis' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @ApiPropertyOptional({ description: 'Programme détaillé' })
  @IsOptional()
  @IsString()
  syllabus?: string;

  @ApiPropertyOptional({ description: 'ID de l\'instructeur' })
  @IsOptional()
  @IsInt()
  instructor?: number;

  @ApiPropertyOptional({ description: 'Métadonnées additionnelles' })
  @IsOptional()
  metadata?: {
    category?: string;
    tags?: string[];
    language?: string;
    duration?: number;
    certificateEligible?: boolean;
  };
}

export class CourseResponseDto {
  @ApiProperty({ description: 'ID du cours' })
  id: number;

  @ApiProperty({ description: 'Titre du cours' })
  title: string;

  @ApiProperty({ description: 'Description du cours' })
  description: string;

  @ApiProperty({ description: 'Code du cours' })
  code: string;

  @ApiProperty({ enum: CourseStatus, description: 'Statut du cours' })
  status: CourseStatus;

  @ApiProperty({ enum: CourseDifficulty, description: 'Difficulté du cours' })
  difficulty: CourseDifficulty;

  @ApiProperty({ description: 'Nombre de crédits' })
  credits: number;

  @ApiProperty({ description: 'Nombre maximum d\'étudiants' })
  maxStudents: number;

  @ApiProperty({ description: 'Étudiants inscrits' })
  enrolledStudents: number;

  @ApiProperty({ description: 'Date de début' })
  startDate: Date;

  @ApiProperty({ description: 'Date de fin' })
  endDate: Date;

  @ApiProperty({ description: 'Heure de début' })
  startTime: string;

  @ApiProperty({ description: 'Heure de fin' })
  endTime: string;

  @ApiProperty({ description: 'Salle de cours' })
  room: string;

  @ApiProperty({ description: 'Prix du cours' })
  price: number;

  @ApiProperty({ description: 'Prérequis' })
  prerequisites: string[];

  @ApiProperty({ description: 'Objectifs du cours' })
  objectives: string[];

  @ApiProperty({ description: 'Matériel requis' })
  materials: string[];

  @ApiProperty({ description: 'Programme détaillé' })
  syllabus: string;

  @ApiProperty({ description: 'ID de l\'instructeur' })
  instructor: number;

  @ApiProperty({ description: 'Date de création' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de dernière modification' })
  updatedAt: Date;
}

export class CourseStatsDto {
  @ApiProperty({ description: 'Nombre total de cours' })
  totalCourses: number;

  @ApiProperty({ description: 'Cours actifs' })
  activeCourses: number;

  @ApiProperty({ description: 'Cours complétés' })
  completedCourses: number;

  @ApiProperty({ description: 'Cours annulés' })
  cancelledCourses: number;

  @ApiProperty({ description: 'Taux d\'occupation moyen' })
  averageOccupancyRate: number;

  @ApiProperty({ description: 'Revenus totaux' })
  totalRevenue: number;

  @ApiProperty({ description: 'Cours par difficulté' })
  byDifficulty: { [key: string]: number };

  @ApiProperty({ description: 'Cours par instructeur (top 10)' })
  topInstructors: {
    instructorId: number;
    instructorName: string;
    courseCount: number;
    averageRating?: number;
  }[];
}

export class CourseFilterDto {
  @ApiPropertyOptional({ description: 'Recherche par titre ou code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CourseStatus, description: 'Filtrer par statut' })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ enum: CourseDifficulty, description: 'Filtrer par difficulté' })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ description: 'ID de l\'instructeur' })
  @IsOptional()
  @IsInt()
  instructor?: number;

  @ApiPropertyOptional({ description: 'Date de début minimale (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({ description: 'Date de début maximale (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional({ description: 'Prix minimum' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Prix maximum' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ description: 'Disponible pour inscription' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  availableForEnrollment?: boolean;

  @ApiPropertyOptional({ description: 'Page', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Nombre d\'éléments par page', minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Tri', enum: ['title', 'startDate', 'price', 'enrolledStudents', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Ordre de tri', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}