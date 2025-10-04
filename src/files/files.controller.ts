import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  Logger,
  HttpStatus,
  HttpException,
  UseGuards,
  ParseIntPipe,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { UploadFileDto, UpdateFileDto, FileResponseDto, FileFilterDto, FileStatsDto, BulkActionDto, ShareFileDto } from './dto/file.dto';
import { File } from './entities/file.entity';
import { JwtAuthGuard } from '../auth/guards/wt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

export class FileApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  constructor(success: boolean, message: string, data?: T, error?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
}

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Uploader un fichier',
    description: 'Upload d\'un fichier avec métadonnées optionnelles',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        description: { type: 'string' },
        category: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE', 'SHARED'] },
        encrypt: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Fichier uploadé avec succès',
    type: FileResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Body() uploadFileDto: UploadFileDto,
    @Req() req: any,
  ): Promise<FileApiResponse<File>> {
    try {
      this.logger.log(`Upload de fichier: ${file.originalname}`);

      if (!file) {
        throw new HttpException(
          new FileApiResponse(false, 'Aucun fichier fourni'),
          HttpStatus.BAD_REQUEST,
        );
      }

      const userId = req.user?.id;
      const uploadedFile = await this.filesService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId,
        uploadFileDto,
      );

      return new FileApiResponse(
        true,
        'Fichier uploadé avec succès',
        uploadedFile,
      );
    } catch (error) {
      this.logger.error(`Erreur upload fichier: ${error.message}`, error.stack);
      throw new HttpException(
        new FileApiResponse(false, 'Erreur lors de l\'upload du fichier', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des fichiers',
    description: 'Récupère la liste des fichiers avec filtres optionnels',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des fichiers récupérée avec succès',
    type: [FileResponseDto],
  })
  async findAll(@Query() filterDto: FileFilterDto, @Req() req: any): Promise<FileApiResponse<File[]>> {
    try {
      this.logger.log('Récupération de la liste des fichiers');

      const userId = req.user?.id;
      const result = await this.filesService.findAll(filterDto, userId);

      const response = new FileApiResponse(
        true,
        `${result.files.length} fichiers récupérés avec succès`,
        result.files,
      );

      response.pagination = {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
      };

      return response;
    } catch (error) {
      this.logger.error(`Erreur récupération fichiers: ${error.message}`, error.stack);
      throw new HttpException(
        new FileApiResponse(false, 'Erreur lors de la récupération des fichiers', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Statistiques des fichiers',
    description: 'Récupère les statistiques détaillées des fichiers',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
    type: FileStatsDto,
  })
  async getStatistics(): Promise<FileApiResponse<FileStatsDto>> {
    try {
      this.logger.log('Récupération des statistiques des fichiers');

      const stats = await this.filesService.getStatistics();

      return new FileApiResponse(
        true,
        'Statistiques des fichiers récupérées avec succès',
        stats,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération statistiques: ${error.message}`, error.stack);
      throw new HttpException(
        new FileApiResponse(false, 'Erreur lors de la récupération des statistiques', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk-action')
  @ApiOperation({
    summary: 'Action groupée sur les fichiers',
    description: 'Effectue une action sur plusieurs fichiers simultanément',
  })
  @ApiResponse({
    status: 200,
    description: 'Action groupée effectuée avec succès',
  })
  async bulkAction(
    @Body() bulkActionDto: BulkActionDto,
    @Req() req: any,
  ): Promise<FileApiResponse<any>> {
    try {
      this.logger.log(`Action groupée: ${bulkActionDto.action} sur ${bulkActionDto.fileIds.length} fichiers`);

      const userId = req.user?.id;
      const result = await this.filesService.bulkAction(bulkActionDto, userId);

      return new FileApiResponse(
        true,
        `Action groupée terminée: ${result.success} succès, ${result.failed} échecs`,
        result,
      );
    } catch (error) {
      this.logger.error(`Erreur action groupée: ${error.message}`, error.stack);
      throw new HttpException(
        new FileApiResponse(false, 'Erreur lors de l\'action groupée', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cleanup-expired')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Nettoyer les fichiers expirés',
    description: 'Supprime automatiquement les fichiers expirés',
  })
  @ApiResponse({
    status: 200,
    description: 'Nettoyage effectué avec succès',
  })
  async cleanupExpired(): Promise<FileApiResponse<any>> {
    try {
      this.logger.log('Nettoyage des fichiers expirés');

      const result = await this.filesService.cleanupExpiredFiles();

      return new FileApiResponse(
        true,
        `Nettoyage terminé: ${result.deleted} fichiers supprimés`,
        result,
      );
    } catch (error) {
      this.logger.error(`Erreur nettoyage: ${error.message}`, error.stack);
      throw new HttpException(
        new FileApiResponse(false, 'Erreur lors du nettoyage', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détails d\'un fichier',
    description: 'Récupère les détails complets d\'un fichier spécifique',
  })
  @ApiParam({ name: 'id', description: 'ID du fichier' })
  @ApiResponse({
    status: 200,
    description: 'Détails du fichier récupérés avec succès',
    type: FileResponseDto,
  })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<FileApiResponse<File>> {
    try {
      this.logger.log(`Récupération des détails du fichier ID: ${id}`);

      const userId = req.user?.id;
      const file = await this.filesService.findOne(id, userId);

      return new FileApiResponse(
        true,
        'Détails du fichier récupérés avec succès',
        file,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération fichier: ${error.message}`, error.stack);
      throw new HttpException(
        new FileApiResponse(false, 'Erreur lors de la récupération du fichier', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Télécharger un fichier',
    description: 'Télécharge le contenu d\'un fichier',
  })
  @ApiParam({ name: 'id', description: 'ID du fichier' })
  @ApiResponse({
    status: 200,
    description: 'Fichier téléchargé avec succès',
  })
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    try {
      this.logger.log(`Téléchargement du fichier ID: ${id}`);

      const userId = req.user?.id;
      const { file, content } = await this.filesService.downloadFile(id, userId);

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Length', content.length);

      res.send(content);
    } catch (error) {
      this.logger.error(`Erreur téléchargement fichier: ${error.message}`, error.stack);
      res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json(
        new FileApiResponse(false, 'Erreur lors du téléchargement', null, error.message)
      );
    }
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un fichier',
    description: 'Met à jour les métadonnées d\'un fichier existant',
  })
  @ApiParam({ name: 'id', description: 'ID du fichier' })
  @ApiResponse({
    status: 200,
    description: 'Fichier mis à jour avec succès',
    type: FileResponseDto,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFileDto: UpdateFileDto,
    @Req() req: any,
  ): Promise<FileApiResponse<File>> {
    try {
      this.logger.log(`Mise à jour du fichier ID: ${id}`);

      const userId = req.user?.id;
      const file = await this.filesService.update(id, updateFileDto, userId);

      return new FileApiResponse(
        true,
        'Fichier mis à jour avec succès',
        file,
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour fichier: ${error.message}`, error.stack);
      throw new HttpException(
        new FileApiResponse(false, 'Erreur lors de la mise à jour du fichier', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/share')
  @ApiOperation({
    summary: 'Partager un fichier',
    description: 'Partage un fichier avec d\'autres utilisateurs',
  })
  @ApiParam({ name: 'id', description: 'ID du fichier' })
  @ApiResponse({
    status: 200,
    description: 'Fichier partagé avec succès',
    type: FileResponseDto,
  })
  async shareFile(
    @Param('id', ParseIntPipe) id: number,
    @Body() shareDto: ShareFileDto,
    @Req() req: any,
  ): Promise<FileApiResponse<File>> {
    try {
      this.logger.log(`Partage du fichier ID: ${id}`);

      const userId = req.user?.id;
      const file = await this.filesService.shareFile(id, shareDto, userId);

      return new FileApiResponse(
        true,
        'Fichier partagé avec succès',
        file,
      );
    } catch (error) {
      this.logger.error(`Erreur partage fichier: ${error.message}`, error.stack);
      throw new HttpException(
        new FileApiResponse(false, 'Erreur lors du partage du fichier', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un fichier',
    description: 'Supprime un fichier (logiquement ou physiquement)',
  })
  @ApiParam({ name: 'id', description: 'ID du fichier' })
  @ApiResponse({
    status: 200,
    description: 'Fichier supprimé avec succès',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('permanent') permanent: boolean = false,
    @Req() req: any,
  ): Promise<FileApiResponse<null>> {
    try {
      this.logger.log(`Suppression du fichier ID: ${id} (permanent: ${permanent})`);

      const userId = req.user?.id;
      await this.filesService.remove(id, userId, permanent);

      return new FileApiResponse(
        true,
        permanent ? 'Fichier supprimé définitivement' : 'Fichier supprimé',
        null,
      );
    } catch (error) {
      this.logger.error(`Erreur suppression fichier: ${error.message}`, error.stack);
      throw new HttpException(
        new FileApiResponse(false, 'Erreur lors de la suppression du fichier', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}