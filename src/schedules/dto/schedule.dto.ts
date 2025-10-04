import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsDateString, IsArray, IsBoolean, IsObject, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleStatus, ScheduleType, RecurrenceType } from '../entities/schedule.entity';

export class CreateScheduleDto {
  @ApiProperty({ description: 'Titre de la session' })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional({ description: 'Description de la session' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID du cours' })
  @IsInt()
  courseId: number;

  @ApiPropertyOptional({ description: 'ID de l\'instructeur' })
  @IsOptional()
  @IsInt()
  instructorId?: number;

  @ApiProperty({ description: 'Date de la session (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Heure de début (HH:MM)' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'Heure de fin (HH:MM)' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Lieu/Adresse' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Salle' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ enum: ScheduleStatus, description: 'Statut de la session' })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @ApiPropertyOptional({ enum: ScheduleType, description: 'Type de session' })
  @IsOptional()
  @IsEnum(ScheduleType)
  type?: ScheduleType;

  @ApiPropertyOptional({ description: 'Capacité maximum', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: RecurrenceType, description: 'Type de récurrence' })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrenceType?: RecurrenceType;

  @ApiPropertyOptional({ description: 'Modèle de récurrence' })
  @IsOptional()
  @IsObject()
  recurrencePattern?: {
    frequency: number;
    daysOfWeek?: number[];
    endDate?: string;
    maxOccurrences?: number;
  };

  @ApiPropertyOptional({ description: 'Ressources nécessaires' })
  @IsOptional()
  @IsObject()
  resources?: {
    equipment?: string[];
    materials?: string[];
    software?: string[];
  };

  @ApiPropertyOptional({ description: 'Ordre du jour' })
  @IsOptional()
  @IsArray()
  agenda?: {
    topic: string;
    duration: number;
    description?: string;
  }[];

  @ApiPropertyOptional({ description: 'Notes additionnelles' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Exigences/Prérequis' })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ description: 'Session en ligne' })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ description: 'Lien pour session en ligne' })
  @IsOptional()
  @IsString()
  onlineLink?: string;

  @ApiPropertyOptional({ description: 'Configuration des notifications' })
  @IsOptional()
  @IsObject()
  notifications?: {
    emailReminder?: boolean;
    smsReminder?: boolean;
    reminderTime?: number;
  };
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: 'Titre de la session' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @ApiPropertyOptional({ description: 'Description de la session' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'ID du cours' })
  @IsOptional()
  @IsInt()
  courseId?: number;

  @ApiPropertyOptional({ description: 'ID de l\'instructeur' })
  @IsOptional()
  @IsInt()
  instructorId?: number;

  @ApiPropertyOptional({ description: 'Date de la session (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Heure de début (HH:MM)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Heure de fin (HH:MM)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Lieu/Adresse' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Salle' })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ enum: ScheduleStatus, description: 'Statut de la session' })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @ApiPropertyOptional({ enum: ScheduleType, description: 'Type de session' })
  @IsOptional()
  @IsEnum(ScheduleType)
  type?: ScheduleType;

  @ApiPropertyOptional({ description: 'Capacité maximum', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Ressources nécessaires' })
  @IsOptional()
  @IsObject()
  resources?: {
    equipment?: string[];
    materials?: string[];
    software?: string[];
  };

  @ApiPropertyOptional({ description: 'Ordre du jour' })
  @IsOptional()
  @IsArray()
  agenda?: {
    topic: string;
    duration: number;
    description?: string;
  }[];

  @ApiPropertyOptional({ description: 'Notes additionnelles' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Exigences/Prérequis' })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ description: 'Session en ligne' })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ description: 'Lien pour session en ligne' })
  @IsOptional()
  @IsString()
  onlineLink?: string;

  @ApiPropertyOptional({ description: 'Lien d\'enregistrement' })
  @IsOptional()
  @IsString()
  recordingLink?: string;

  @ApiPropertyOptional({ description: 'Configuration des notifications' })
  @IsOptional()
  @IsObject()
  notifications?: {
    emailReminder?: boolean;
    smsReminder?: boolean;
    reminderTime?: number;
  };

  @ApiPropertyOptional({ description: 'Métadonnées' })
  @IsOptional()
  @IsObject()
  metadata?: {
    isRecorded?: boolean;
    recordingDuration?: number;
    avgAttendanceRate?: number;
    feedback?: any;
  };
}

export class ScheduleResponseDto {
  @ApiProperty({ description: 'ID de la session' })
  id: number;

  @ApiProperty({ description: 'Titre de la session' })
  title: string;

  @ApiProperty({ description: 'Description de la session' })
  description: string;

  @ApiProperty({ description: 'ID du cours' })
  courseId: number;

  @ApiProperty({ description: 'Informations du cours' })
  course: any;

  @ApiProperty({ description: 'ID de l\'instructeur' })
  instructorId: number;

  @ApiProperty({ description: 'Informations de l\'instructeur' })
  instructor: any;

  @ApiProperty({ description: 'Date de la session' })
  date: Date;

  @ApiProperty({ description: 'Heure de début' })
  startTime: string;

  @ApiProperty({ description: 'Heure de fin' })
  endTime: string;

  @ApiProperty({ description: 'Lieu/Adresse' })
  location: string;

  @ApiProperty({ description: 'Salle' })
  room: string;

  @ApiProperty({ enum: ScheduleStatus, description: 'Statut de la session' })
  status: ScheduleStatus;

  @ApiProperty({ enum: ScheduleType, description: 'Type de session' })
  type: ScheduleType;

  @ApiProperty({ description: 'Capacité maximum' })
  capacity: number;

  @ApiProperty({ description: 'Nombre de participants' })
  attendees: number;

  @ApiProperty({ description: 'Session en ligne' })
  isOnline: boolean;

  @ApiProperty({ description: 'Date de création' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de dernière modification' })
  updatedAt: Date;
}

export class AttendanceDto {
  @ApiProperty({ description: 'ID de l\'étudiant' })
  @IsInt()
  studentId: number;

  @ApiProperty({ enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'], description: 'Statut de présence' })
  @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

  @ApiPropertyOptional({ description: 'Heure d\'arrivée (HH:MM)' })
  @IsOptional()
  @IsString()
  arrivalTime?: string;

  @ApiPropertyOptional({ description: 'Notes sur la présence' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkAttendanceDto {
  @ApiProperty({ description: 'Liste des présences', type: [AttendanceDto] })
  @IsArray()
  attendance: AttendanceDto[];
}

export class ScheduleFilterDto {
  @ApiPropertyOptional({ description: 'Recherche par titre' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'ID du cours' })
  @IsOptional()
  @IsInt()
  courseId?: number;

  @ApiPropertyOptional({ description: 'ID de l\'instructeur' })
  @IsOptional()
  @IsInt()
  instructorId?: number;

  @ApiPropertyOptional({ enum: ScheduleStatus, description: 'Statut' })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @ApiPropertyOptional({ enum: ScheduleType, description: 'Type de session' })
  @IsOptional()
  @IsEnum(ScheduleType)
  type?: ScheduleType;

  @ApiPropertyOptional({ description: 'Date de début (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Seulement les sessions en ligne' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onlineOnly?: boolean;

  @ApiPropertyOptional({ description: 'Seulement les sessions avec places disponibles' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  availableOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Nombre d\'éléments par page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Tri', enum: ['date', 'startTime', 'title', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'date';

  @ApiPropertyOptional({ description: 'Ordre de tri', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

export class ScheduleStatsDto {
  @ApiProperty({ description: 'Total des sessions programmées' })
  totalSchedules: number;

  @ApiProperty({ description: 'Sessions actives' })
  activeSchedules: number;

  @ApiProperty({ description: 'Sessions complétées' })
  completedSchedules: number;

  @ApiProperty({ description: 'Sessions annulées' })
  cancelledSchedules: number;

  @ApiProperty({ description: 'Taux de présence moyen' })
  averageAttendanceRate: number;

  @ApiProperty({ description: 'Sessions par type' })
  byType: { [key: string]: number };

  @ApiProperty({ description: 'Sessions par statut' })
  byStatus: { [key: string]: number };

  @ApiProperty({ description: 'Sessions par jour de la semaine' })
  byDayOfWeek: {
    day: string;
    count: number;
  }[];

  @ApiProperty({ description: 'Heures les plus populaires' })
  popularTimeSlots: {
    timeSlot: string;
    count: number;
  }[];

  @ApiProperty({ description: 'Instructeurs les plus actifs' })
  topInstructors: {
    instructorId: number;
    instructorName: string;
    sessionCount: number;
    avgAttendanceRate: number;
  }[];
}