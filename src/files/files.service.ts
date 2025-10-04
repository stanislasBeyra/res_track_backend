import { Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindManyOptions, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { File, FileType, FileStatus, FileVisibility } from './entities/file.entity';
import { UploadFileDto, UpdateFileDto, FileFilterDto, FileStatsDto, BulkActionDto, ShareFileDto } from './dto/file.dto';
import { UsersService } from '../users/users.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as mime from 'mime-types';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadPath = './uploads';
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB

  constructor(
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    private usersService: UsersService,
  ) {
    this.ensureUploadDirectory();
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    uploaderId: number,
    uploadDto: UploadFileDto,
  ): Promise<File> {
    try {
      this.logger.log(`Upload de fichier: ${originalName} par utilisateur ${uploaderId}`);

      if (fileBuffer.length > this.maxFileSize) {
        throw new BadRequestException(`Le fichier dépasse la taille maximale autorisée (${this.maxFileSize / 1024 / 1024}MB)`);
      }

      const uploader = await this.usersService.findOne(uploaderId);
      
      const fileExtension = path.extname(originalName);
      const fileName = `${Date.now()}_${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
      const filePath = path.join(this.uploadPath, fileName);

      const fileType = this.determineFileType(mimeType);
      
      let processedBuffer = fileBuffer;
      let isEncrypted = false;
      let encryptionKey: string | null = null;

      if (uploadDto.encrypt) {
        const key = crypto.randomBytes(32);
        // Create a deterministic IV from the key for consistency
        const iv = crypto.createHash('md5').update(key).digest().slice(0, 16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        processedBuffer = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
        encryptionKey = key.toString('hex');
        isEncrypted = true;
      }

      await fs.promises.writeFile(filePath, processedBuffer);

      const metadata = await this.extractMetadata(filePath, mimeType);
      const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

      const file = this.fileRepository.create({
        originalName,
        fileName,
        filePath,
        mimeType,
        size: fileBuffer.length,
        type: fileType,
        status: FileStatus.ACTIVE,
        visibility: uploadDto.visibility || FileVisibility.PRIVATE,
        description: uploadDto.description,
        category: uploadDto.category,
        tags: uploadDto.tags,
        uploaderId,
        isEncrypted,
        encryptionKey,
        expiresAt: uploadDto.expiresAt ? new Date(uploadDto.expiresAt) : null,
        metadata: {
          ...metadata,
          checksum,
        },
        access: {
          allowedUsers: uploadDto.allowedUsers,
          allowedRoles: uploadDto.allowedRoles,
          downloadLimit: uploadDto.downloadLimit,
        },
        downloadCount: 0,
        isProcessed: true,
        versions: [],
      } as any);

      const savedFile = await this.fileRepository.save(file);
      const savedFileEntity = Array.isArray(savedFile) ? savedFile[0] : savedFile;
      this.logger.log(`Fichier uploadé avec succès: ID ${savedFileEntity.id}`);

      return await this.findOne(savedFileEntity.id);
    } catch (error) {
      this.logger.error(`Erreur upload fichier: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(filterDto?: FileFilterDto, userId?: number): Promise<{ files: File[], total: number, page: number, limit: number }> {
    try {
      this.logger.log('Récupération de la liste des fichiers');

      const page = filterDto?.page || 1;
      const limit = filterDto?.limit || 20;
      const skip = (page - 1) * limit;

      const query: FindManyOptions<File> = {
        relations: ['uploader'],
        skip,
        take: limit,
        order: {
          [filterDto?.sortBy || 'createdAt']: filterDto?.sortOrder || 'DESC',
        },
      };

      const where: any = {};

      // Filtres de sécurité basés sur l'utilisateur
      if (userId) {
        where.uploaderId = userId;
        // TODO: Ajouter logique pour les fichiers partagés avec cet utilisateur
      }

      if (filterDto?.search) {
        where.originalName = Like(`%${filterDto.search}%`);
      }

      if (filterDto?.type) {
        where.type = filterDto.type;
      }

      if (filterDto?.status) {
        where.status = filterDto.status;
      } else {
        // Par défaut, ne pas montrer les fichiers supprimés
        where.status = In([FileStatus.ACTIVE, FileStatus.ARCHIVED]);
      }

      if (filterDto?.visibility) {
        where.visibility = filterDto.visibility;
      }

      if (filterDto?.category) {
        where.category = Like(`%${filterDto.category}%`);
      }

      if (filterDto?.uploaderId) {
        where.uploaderId = filterDto.uploaderId;
      }

      if (filterDto?.createdAfter || filterDto?.createdBefore) {
        where.createdAt = {};
        if (filterDto.createdAfter) {
          where.createdAt = { ...where.createdAt, ...MoreThanOrEqual(new Date(filterDto.createdAfter)) };
        }
        if (filterDto.createdBefore) {
          where.createdAt = { ...where.createdAt, ...LessThanOrEqual(new Date(filterDto.createdBefore)) };
        }
      }

      if (filterDto?.minSize !== undefined || filterDto?.maxSize !== undefined) {
        where.size = {};
        if (filterDto.minSize !== undefined) {
          where.size = { ...where.size, ...MoreThanOrEqual(filterDto.minSize) };
        }
        if (filterDto.maxSize !== undefined) {
          where.size = { ...where.size, ...LessThanOrEqual(filterDto.maxSize) };
        }
      }

      if (filterDto?.encryptedOnly) {
        where.isEncrypted = true;
      }

      query.where = where;

      const [files, total] = await this.fileRepository.findAndCount(query);

      let filteredFiles = files;

      if (filterDto?.expiredOnly) {
        const now = new Date();
        filteredFiles = files.filter(file => file.expiresAt && file.expiresAt < now);
      }

      this.logger.log(`${filteredFiles.length} fichiers récupérés sur ${total} total`);

      return { files: filteredFiles, total, page, limit };
    } catch (error) {
      this.logger.error(`Erreur récupération fichiers: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number, userId?: number): Promise<File> {
    try {
      this.logger.log(`Recherche du fichier ID: ${id}`);

      const file = await this.fileRepository.findOne({
        where: { id },
        relations: ['uploader'],
      });

      if (!file) {
        throw new NotFoundException(`Fichier avec l'ID ${id} non trouvé`);
      }

      // Vérification des permissions d'accès
      if (userId && !this.canAccessFile(file, userId)) {
        throw new ForbiddenException('Accès au fichier non autorisé');
      }

      return file;
    } catch (error) {
      this.logger.error(`Erreur recherche fichier: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateFileDto: UpdateFileDto, userId?: number): Promise<File> {
    try {
      this.logger.log(`Mise à jour du fichier ID: ${id}`);

      const file = await this.findOne(id, userId);

      // Vérification des permissions de modification
      if (userId && file.uploaderId !== userId) {
        throw new ForbiddenException('Modification non autorisée');
      }

      const updatedData = { ...updateFileDto };
      if (updateFileDto.expiresAt) {
        (updatedData as any).expiresAt = new Date(updateFileDto.expiresAt);
      }

      if (updateFileDto.allowedUsers || updateFileDto.allowedRoles || updateFileDto.downloadLimit) {
        (updatedData as any).access = {
          ...file.access,
          allowedUsers: updateFileDto.allowedUsers,
          allowedRoles: updateFileDto.allowedRoles,
          downloadLimit: updateFileDto.downloadLimit,
        };
      }

      await this.fileRepository.update(id, updatedData);

      this.logger.log(`Fichier ID ${id} mis à jour avec succès`);
      return await this.findOne(id, userId);
    } catch (error) {
      this.logger.error(`Erreur mise à jour fichier: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: number, userId?: number, permanent: boolean = false): Promise<void> {
    try {
      this.logger.log(`Suppression du fichier ID: ${id} (permanent: ${permanent})`);

      const file = await this.findOne(id, userId);

      // Vérification des permissions de suppression
      if (userId && file.uploaderId !== userId) {
        throw new ForbiddenException('Suppression non autorisée');
      }

      if (permanent) {
        // Suppression physique du fichier
        try {
          await fs.promises.unlink(file.filePath);
          this.logger.log(`Fichier physique supprimé: ${file.filePath}`);
        } catch (error) {
          this.logger.warn(`Impossible de supprimer le fichier physique: ${error.message}`);
        }

        await this.fileRepository.remove(file);
        this.logger.log(`Fichier ID ${id} supprimé définitivement`);
      } else {
        // Suppression logique
        await this.fileRepository.update(id, { status: FileStatus.DELETED });
        this.logger.log(`Fichier ID ${id} marqué comme supprimé`);
      }
    } catch (error) {
      this.logger.error(`Erreur suppression fichier: ${error.message}`, error.stack);
      throw error;
    }
  }

  async downloadFile(id: number, userId?: number): Promise<{ file: File, content: Buffer }> {
    try {
      this.logger.log(`Téléchargement du fichier ID: ${id} par utilisateur ${userId}`);

      const file = await this.findOne(id, userId);

      if (file.status === FileStatus.DELETED) {
        throw new NotFoundException('Fichier supprimé non disponible');
      }

      if (file.expiresAt && file.expiresAt < new Date()) {
        throw new BadRequestException('Fichier expiré');
      }

      // Vérification des limites de téléchargement
      if (file.access?.downloadLimit && file.downloadCount >= file.access.downloadLimit) {
        throw new BadRequestException('Limite de téléchargements atteinte');
      }

      // Vérification des permissions de téléchargement
      if (userId && !this.canDownloadFile(file, userId)) {
        throw new ForbiddenException('Téléchargement non autorisé');
      }

      let content = await fs.promises.readFile(file.filePath);

      // Déchiffrement si nécessaire
      if (file.isEncrypted && file.encryptionKey) {
        try {
          const key = Buffer.from(file.encryptionKey, 'hex');
          // Create a deterministic IV from the key for backward compatibility
          const iv = crypto.createHash('md5').update(key).digest().slice(0, 16);
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          content = Buffer.concat([decipher.update(content), decipher.final()]);
        } catch (error) {
          this.logger.error(`Erreur déchiffrement: ${error.message}`);
          throw new BadRequestException('Impossible de déchiffrer le fichier');
        }
      }

      // Mise à jour des statistiques de téléchargement
      await this.fileRepository.update(id, {
        downloadCount: file.downloadCount + 1,
        lastDownloaded: new Date(),
      });

      this.logger.log(`Fichier ID ${id} téléchargé avec succès`);

      return { file, content };
    } catch (error) {
      this.logger.error(`Erreur téléchargement fichier: ${error.message}`, error.stack);
      throw error;
    }
  }

  async bulkAction(bulkActionDto: BulkActionDto, userId?: number): Promise<{ success: number, failed: number, errors: string[] }> {
    try {
      this.logger.log(`Action groupée: ${bulkActionDto.action} sur ${bulkActionDto.fileIds.length} fichiers`);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const fileId of bulkActionDto.fileIds) {
        try {
          const file = await this.findOne(fileId, userId);

          // Vérification des permissions
          if (userId && file.uploaderId !== userId) {
            throw new ForbiddenException('Action non autorisée');
          }

          switch (bulkActionDto.action) {
            case 'delete':
              await this.fileRepository.update(fileId, { status: FileStatus.DELETED });
              break;
            case 'archive':
              await this.fileRepository.update(fileId, { status: FileStatus.ARCHIVED });
              break;
            case 'restore':
              await this.fileRepository.update(fileId, { status: FileStatus.ACTIVE });
              break;
            case 'changeVisibility':
              if (bulkActionDto.newVisibility) {
                await this.fileRepository.update(fileId, { visibility: bulkActionDto.newVisibility });
              }
              break;
          }

          success++;
        } catch (error) {
          failed++;
          errors.push(`Fichier ${fileId}: ${error.message}`);
        }
      }

      this.logger.log(`Action groupée terminée: ${success} succès, ${failed} échecs`);

      return { success, failed, errors };
    } catch (error) {
      this.logger.error(`Erreur action groupée: ${error.message}`, error.stack);
      throw error;
    }
  }

  async shareFile(id: number, shareDto: ShareFileDto, userId?: number): Promise<File> {
    try {
      this.logger.log(`Partage du fichier ID: ${id} avec ${shareDto.userIds.length} utilisateurs`);

      const file = await this.findOne(id, userId);

      // Vérification des permissions de partage
      if (userId && file.uploaderId !== userId) {
        throw new ForbiddenException('Partage non autorisé');
      }

      // Vérification que les utilisateurs existent
      for (const userId of shareDto.userIds) {
        await this.usersService.findOne(userId);
      }

      const updatedAccess = {
        ...file.access,
        allowedUsers: [...(file.access?.allowedUsers || []), ...shareDto.userIds],
        expiresAt: shareDto.expiresAt ? new Date(shareDto.expiresAt) : file.access?.expiresAt,
        downloadLimit: shareDto.downloadLimit || file.access?.downloadLimit,
      };

      await this.fileRepository.update(id, {
        access: updatedAccess,
        visibility: FileVisibility.SHARED,
      });

      this.logger.log(`Fichier ID ${id} partagé avec succès`);

      return await this.findOne(id, userId);
    } catch (error) {
      this.logger.error(`Erreur partage fichier: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStatistics(): Promise<FileStatsDto> {
    try {
      this.logger.log('Génération des statistiques des fichiers');

      const files = await this.fileRepository.find({
        relations: ['uploader'],
      });

      const totalFiles = files.length;
      const activeFiles = files.filter(f => f.status === FileStatus.ACTIVE).length;
      const archivedFiles = files.filter(f => f.status === FileStatus.ARCHIVED).length;
      const deletedFiles = files.filter(f => f.status === FileStatus.DELETED).length;

      const totalSize = files.reduce((sum, file) => sum + Number(file.size), 0);
      const totalSizeFormatted = this.formatFileSize(totalSize);

      const totalDownloads = files.reduce((sum, file) => sum + file.downloadCount, 0);

      const byType = files.reduce((acc, file) => {
        acc[file.type] = (acc[file.type] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const byVisibility = files.reduce((acc, file) => {
        acc[file.visibility] = (acc[file.visibility] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Uploads par mois (12 derniers mois)
      const uploadsByMonth = this.getUploadsByMonth(files);

      // Top uploaders
      const uploaderStats = files.reduce((acc, file) => {
        if (file.uploaderId && file.uploader) {
          const key = file.uploaderId;
          if (!acc[key]) {
            acc[key] = {
              uploaderId: file.uploaderId,
              uploaderName: `${file.uploader.profile?.firstName || ''} ${file.uploader.profile?.lastName || ''}`.trim(),
              fileCount: 0,
              totalSize: 0,
            };
          }
          acc[key].fileCount++;
          acc[key].totalSize += Number(file.size);
        }
        return acc;
      }, {} as { [key: number]: any });

      const topUploaders = Object.values(uploaderStats)
        .sort((a: any, b: any) => b.fileCount - a.fileCount)
        .slice(0, 10);

      // Fichiers les plus téléchargés
      const mostDownloaded = files
        .filter(f => f.downloadCount > 0)
        .sort((a, b) => b.downloadCount - a.downloadCount)
        .slice(0, 10)
        .map(file => ({
          fileId: file.id,
          fileName: file.originalName,
          downloadCount: file.downloadCount,
        }));

      // Formats populaires
      const formatStats = files.reduce((acc, file) => {
        const key = file.mimeType;
        if (!acc[key]) {
          acc[key] = {
            mimeType: file.mimeType,
            count: 0,
            totalSize: 0,
          };
        }
        acc[key].count++;
        acc[key].totalSize += Number(file.size);
        return acc;
      }, {} as { [key: string]: any });

      const popularFormats = Object.values(formatStats)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10);

      return {
        totalFiles,
        activeFiles,
        archivedFiles,
        deletedFiles,
        totalSize,
        totalSizeFormatted,
        totalDownloads,
        byType,
        byVisibility,
        uploadsByMonth,
        topUploaders,
        mostDownloaded,
        popularFormats,
      };
    } catch (error) {
      this.logger.error(`Erreur génération statistiques fichiers: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cleanupExpiredFiles(): Promise<{ deleted: number, errors: string[] }> {
    try {
      this.logger.log('Nettoyage des fichiers expirés');

      const expiredFiles = await this.fileRepository.find({
        where: {
          expiresAt: LessThanOrEqual(new Date()),
          status: In([FileStatus.ACTIVE, FileStatus.ARCHIVED]),
        },
      });

      let deleted = 0;
      const errors: string[] = [];

      for (const file of expiredFiles) {
        try {
          await this.remove(file.id, undefined, true);
          deleted++;
        } catch (error) {
          errors.push(`Fichier ${file.id}: ${error.message}`);
        }
      }

      this.logger.log(`Nettoyage terminé: ${deleted} fichiers supprimés, ${errors.length} erreurs`);

      return { deleted, errors };
    } catch (error) {
      this.logger.error(`Erreur nettoyage fichiers expirés: ${error.message}`, error.stack);
      throw error;
    }
  }

  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
      this.logger.log(`Répertoire d'upload créé: ${this.uploadPath}`);
    }
  }

  private determineFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'].includes(mimeType)) {
      return FileType.ARCHIVE;
    }
    if (['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimeType)) {
      return FileType.DOCUMENT;
    }
    return FileType.OTHER;
  }

  private async extractMetadata(filePath: string, mimeType: string): Promise<any> {
    const metadata: any = {};
    
    // Métadonnées de base pour tous les fichiers
    try {
      const stats = await fs.promises.stat(filePath);
      metadata.size = stats.size;
      metadata.lastModified = stats.mtime;
    } catch (error) {
      this.logger.warn(`Impossible de lire les métadonnées: ${error.message}`);
    }

    // TODO: Ajouter extraction de métadonnées spécifiques (images, vidéos, etc.)
    
    return metadata;
  }

  private canAccessFile(file: File, userId: number): boolean {
    // L'utilisateur peut accéder à ses propres fichiers
    if (file.uploaderId === userId) return true;

    // Fichiers publics accessibles à tous
    if (file.visibility === FileVisibility.PUBLIC) return true;

    // Fichiers partagés avec cet utilisateur
    if (file.visibility === FileVisibility.SHARED && file.access?.allowedUsers?.includes(userId)) {
      return true;
    }

    // TODO: Vérifier les rôles autorisés

    return false;
  }

  private canDownloadFile(file: File, userId: number): boolean {
    return this.canAccessFile(file, userId);
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  private getUploadsByMonth(files: File[]): any[] {
    const months: Array<{ month: string; count: number; totalSize: number }> = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM

      const monthFiles = files.filter(file => 
        file.createdAt.toISOString().substring(0, 7) === monthKey
      );

      months.push({
        month: monthKey,
        count: monthFiles.length,
        totalSize: monthFiles.reduce((sum, file) => sum + Number(file.size), 0),
      });
    }

    return months;
  }
}