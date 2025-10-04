import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsArray, IsBoolean, IsDateString, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { FileType, FileStatus, FileVisibility } from '../entities/file.entity';

export class UploadFileDto {
  @ApiPropertyOptional({ description: 'Description du fichier' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @ApiPropertyOptional({ description: 'Catégorie du fichier' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  category?: string;

  @ApiPropertyOptional({ description: 'Tags associés au fichier' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: FileVisibility, description: 'Visibilité du fichier' })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @ApiPropertyOptional({ description: 'Date d\'expiration (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Chiffrer le fichier' })
  @IsOptional()
  @IsBoolean()
  encrypt?: boolean;

  @ApiPropertyOptional({ description: 'Utilisateurs autorisés (IDs)' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  allowedUsers?: number[];

  @ApiPropertyOptional({ description: 'Rôles autorisés' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @ApiPropertyOptional({ description: 'Limite de téléchargements' })
  @IsOptional()
  @IsInt()
  @Min(1)
  downloadLimit?: number;
}

export class UpdateFileDto {
  @ApiPropertyOptional({ description: 'Description du fichier' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @ApiPropertyOptional({ description: 'Catégorie du fichier' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  category?: string;

  @ApiPropertyOptional({ description: 'Tags associés au fichier' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: FileVisibility, description: 'Visibilité du fichier' })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @ApiPropertyOptional({ enum: FileStatus, description: 'Statut du fichier' })
  @IsOptional()
  @IsEnum(FileStatus)
  status?: FileStatus;

  @ApiPropertyOptional({ description: 'Date d\'expiration (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Utilisateurs autorisés (IDs)' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  allowedUsers?: number[];

  @ApiPropertyOptional({ description: 'Rôles autorisés' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @ApiPropertyOptional({ description: 'Limite de téléchargements' })
  @IsOptional()
  @IsInt()
  @Min(1)
  downloadLimit?: number;
}

export class FileResponseDto {
  @ApiProperty({ description: 'ID du fichier' })
  id: number;

  @ApiProperty({ description: 'Nom original du fichier' })
  originalName: string;

  @ApiProperty({ description: 'Nom du fichier sur le serveur' })
  fileName: string;

  @ApiProperty({ description: 'Type MIME' })
  mimeType: string;

  @ApiProperty({ description: 'Taille en octets' })
  size: number;

  @ApiProperty({ enum: FileType, description: 'Type de fichier' })
  type: FileType;

  @ApiProperty({ enum: FileStatus, description: 'Statut du fichier' })
  status: FileStatus;

  @ApiProperty({ enum: FileVisibility, description: 'Visibilité du fichier' })
  visibility: FileVisibility;

  @ApiProperty({ description: 'Description du fichier' })
  description: string;

  @ApiProperty({ description: 'Catégorie du fichier' })
  category: string;

  @ApiProperty({ description: 'Tags associés' })
  tags: string[];

  @ApiProperty({ description: 'ID de l\'utilisateur qui a uploadé' })
  uploaderId: number;

  @ApiProperty({ description: 'Nombre de téléchargements' })
  downloadCount: number;

  @ApiProperty({ description: 'Dernière date de téléchargement' })
  lastDownloaded: Date;

  @ApiProperty({ description: 'Date d\'expiration' })
  expiresAt: Date;

  @ApiProperty({ description: 'Fichier chiffré' })
  isEncrypted: boolean;

  @ApiProperty({ description: 'Fichier traité' })
  isProcessed: boolean;

  @ApiProperty({ description: 'Date de création' })
  createdAt: Date;

  @ApiProperty({ description: 'Date de dernière modification' })
  updatedAt: Date;
}

export class FileFilterDto {
  @ApiPropertyOptional({ description: 'Recherche par nom de fichier' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: FileType, description: 'Type de fichier' })
  @IsOptional()
  @IsEnum(FileType)
  type?: FileType;

  @ApiPropertyOptional({ enum: FileStatus, description: 'Statut' })
  @IsOptional()
  @IsEnum(FileStatus)
  status?: FileStatus;

  @ApiPropertyOptional({ enum: FileVisibility, description: 'Visibilité' })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @ApiPropertyOptional({ description: 'Catégorie' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'ID de l\'uploader' })
  @IsOptional()
  @IsInt()
  uploaderId?: number;

  @ApiPropertyOptional({ description: 'Date de création minimale (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Date de création maximale (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({ description: 'Taille minimale en octets' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSize?: number;

  @ApiPropertyOptional({ description: 'Taille maximale en octets' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxSize?: number;

  @ApiPropertyOptional({ description: 'Seulement les fichiers expirés' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  expiredOnly?: boolean;

  @ApiPropertyOptional({ description: 'Seulement les fichiers chiffrés' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  encryptedOnly?: boolean;

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

  @ApiPropertyOptional({ description: 'Tri', enum: ['originalName', 'size', 'createdAt', 'downloadCount'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Ordre de tri', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class FileStatsDto {
  @ApiProperty({ description: 'Nombre total de fichiers' })
  totalFiles: number;

  @ApiProperty({ description: 'Fichiers actifs' })
  activeFiles: number;

  @ApiProperty({ description: 'Fichiers archivés' })
  archivedFiles: number;

  @ApiProperty({ description: 'Fichiers supprimés' })
  deletedFiles: number;

  @ApiProperty({ description: 'Taille totale en octets' })
  totalSize: number;

  @ApiProperty({ description: 'Taille totale formatée' })
  totalSizeFormatted: string;

  @ApiProperty({ description: 'Total des téléchargements' })
  totalDownloads: number;

  @ApiProperty({ description: 'Fichiers par type' })
  byType: { [key: string]: number };

  @ApiProperty({ description: 'Fichiers par visibilité' })
  byVisibility: { [key: string]: number };

  @ApiProperty({ description: 'Fichiers par mois' })
  uploadsByMonth: {
    month: string;
    count: number;
    totalSize: number;
  }[];

  @ApiProperty({ description: 'Top des uploaders' })
  topUploaders: {
    uploaderId: number;
    uploaderName: string;
    fileCount: number;
    totalSize: number;
  }[];

  @ApiProperty({ description: 'Fichiers les plus téléchargés' })
  mostDownloaded: {
    fileId: number;
    fileName: string;
    downloadCount: number;
  }[];

  @ApiProperty({ description: 'Formats de fichiers populaires' })
  popularFormats: {
    mimeType: string;
    count: number;
    totalSize: number;
  }[];
}

export class BulkActionDto {
  @ApiProperty({ description: 'IDs des fichiers à traiter' })
  @IsArray()
  @IsInt({ each: true })
  fileIds: number[];

  @ApiProperty({ enum: ['delete', 'archive', 'restore', 'changeVisibility'], description: 'Action à effectuer' })
  @IsEnum(['delete', 'archive', 'restore', 'changeVisibility'])
  action: 'delete' | 'archive' | 'restore' | 'changeVisibility';

  @ApiPropertyOptional({ enum: FileVisibility, description: 'Nouvelle visibilité (si action = changeVisibility)' })
  @IsOptional()
  @IsEnum(FileVisibility)
  newVisibility?: FileVisibility;
}

export class ShareFileDto {
  @ApiProperty({ description: 'Utilisateurs à partager avec (IDs)' })
  @IsArray()
  @IsInt({ each: true })
  userIds: number[];

  @ApiPropertyOptional({ description: 'Date d\'expiration du partage (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Limite de téléchargements pour le partage' })
  @IsOptional()
  @IsInt()
  @Min(1)
  downloadLimit?: number;

  @ApiPropertyOptional({ description: 'Message personnalisé' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;
}