import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query, 
  ParseIntPipe, 
  ValidationPipe,
  HttpStatus,
  HttpException,
  Logger,
  BadRequestException,
  UseGuards,
  Res,
  StreamableFile,
  DefaultValuePipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth, 
  ApiParam, 
  ApiQuery 
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { JwtAuthGuard } from '../auth/guards/wt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import * as fs from 'fs';

// DTO pour les réponses standardisées
export class ReportApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  constructor(success: boolean, message: string, data?: T, error?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Créer un nouveau rapport',
    description: 'Génère un nouveau rapport selon les paramètres spécifiés' 
  })
  @ApiBody({ type: CreateReportDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Rapport créé avec succès',
    type: ReportResponseDto 
  })
  async create(
    @Body(ValidationPipe) createReportDto: CreateReportDto,
    @CurrentUser() user: any
  ): Promise<ReportApiResponse<ReportResponseDto>> {
    try {
      this.logger.log(`Création d'un rapport par l'utilisateur ${user.id}: ${createReportDto.title}`);
      
      // Ajouter l'utilisateur actuel comme générateur
      const reportData = {
        ...createReportDto,
        generatedBy: user.id,
      };

      const report = await this.reportsService.create(reportData);
      
      this.logger.log(`Rapport ${report.id} créé avec succès`);
      return new ReportApiResponse(true, 'Rapport créé avec succès', report);
    } catch (error) {
      this.logger.error(`Erreur lors de la création du rapport: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors de la création du rapport', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @ApiOperation({ 
    summary: 'Récupérer tous les rapports',
    description: 'Retourne la liste des rapports avec filtres et pagination' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des rapports récupérée avec succès' 
  })
  async findAll(
    @Query() filters: ReportFiltersDto
  ): Promise<ReportApiResponse<ReportResponseDto[]>> {
    try {
      this.logger.log('Récupération de la liste des rapports');
      
      const result = await this.reportsService.findAll(filters);
      
      const response = new ReportApiResponse(
        true, 
        `${result.data.length} rapport(s) récupéré(s)`, 
        result.data
      );
      response.pagination = result.pagination;

      return response;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des rapports: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors de la récupération des rapports', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('attendance/:studentId')
  @ApiOperation({ 
    summary: 'Générer rapport d\'assiduité d\'un étudiant',
    description: 'Génère un rapport détaillé d\'assiduité pour un étudiant donné' 
  })
  @ApiParam({ name: 'studentId', description: 'ID de l\'étudiant' })
  @ApiQuery({ name: 'startDate', description: 'Date de début (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'Date de fin (YYYY-MM-DD)' })
  async getAttendanceReport(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<ReportApiResponse<any>> {
    try {
      this.logger.log(`Génération rapport assiduité pour l'étudiant ${studentId}`);
      
      if (!startDate || !endDate) {
        throw new BadRequestException('Les dates de début et fin sont requises');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        throw new BadRequestException('La date de début doit être antérieure à la date de fin');
      }

      const report = await this.reportsService.generateAttendanceReport(studentId, start, end);
      
      this.logger.log(`Rapport d'assiduité généré pour l'étudiant ${studentId}`);
      return new ReportApiResponse(true, 'Rapport d\'assiduité généré avec succès', report);
    } catch (error) {
      this.logger.error(`Erreur génération rapport assiduité: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors de la génération du rapport d\'assiduité', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('absences/summary')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Générer résumé des absences',
    description: 'Génère un résumé détaillé des absences pour une période donnée' 
  })
  @ApiQuery({ name: 'startDate', description: 'Date de début (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'Date de fin (YYYY-MM-DD)' })
  async getAbsencesSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<ReportApiResponse<any>> {
    try {
      this.logger.log('Génération résumé des absences');
      
      if (!startDate || !endDate) {
        throw new BadRequestException('Les dates de début et fin sont requises');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const report = await this.reportsService.generateAbsencesSummary(start, end);
      
      this.logger.log('Résumé des absences généré avec succès');
      return new ReportApiResponse(true, 'Résumé des absences généré avec succès', report);
    } catch (error) {
      this.logger.error(`Erreur génération résumé absences: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors de la génération du résumé des absences', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('alerts/trends')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Générer tendances des alertes',
    description: 'Analyse les tendances des alertes pour une période donnée' 
  })
  @ApiQuery({ name: 'startDate', description: 'Date de début (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'Date de fin (YYYY-MM-DD)' })
  async getAlertsTrends(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<ReportApiResponse<any>> {
    try {
      this.logger.log('Génération tendances des alertes');
      
      if (!startDate || !endDate) {
        throw new BadRequestException('Les dates de début et fin sont requises');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const report = await this.reportsService.generateAlertsTrends(start, end);
      
      this.logger.log('Tendances des alertes générées avec succès');
      return new ReportApiResponse(true, 'Tendances des alertes générées avec succès', report);
    } catch (error) {
      this.logger.error(`Erreur génération tendances alertes: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors de la génération des tendances d\'alertes', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('export/csv/:id')
  @ApiOperation({ 
    summary: 'Exporter rapport en CSV',
    description: 'Télécharge un rapport au format CSV' 
  })
  @ApiParam({ name: 'id', description: 'ID du rapport' })
  async exportCsv(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      this.logger.log(`Export CSV du rapport ${id}`);
      
      const { filePath, fileName, mimeType } = await this.reportsService.downloadReport(id);
      
      const file = fs.createReadStream(filePath);
      
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      return new StreamableFile(file);
    } catch (error) {
      this.logger.error(`Erreur export CSV: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors de l\'export CSV', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('export/pdf/:id')
  @ApiOperation({ 
    summary: 'Exporter rapport en PDF',
    description: 'Télécharge un rapport au format PDF' 
  })
  @ApiParam({ name: 'id', description: 'ID du rapport' })
  async exportPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      this.logger.log(`Export PDF du rapport ${id}`);
      
      const { filePath, fileName, mimeType } = await this.reportsService.downloadReport(id);
      
      const file = fs.createReadStream(filePath);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      return new StreamableFile(file);
    } catch (error) {
      this.logger.error(`Erreur export PDF: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors de l\'export PDF', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer un rapport par ID',
    description: 'Retourne les détails d\'un rapport spécifique' 
  })
  @ApiParam({ name: 'id', description: 'ID du rapport' })
  @ApiResponse({ 
    status: 200, 
    description: 'Rapport récupéré avec succès',
    type: ReportResponseDto 
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ReportApiResponse<ReportResponseDto>> {
    try {
      this.logger.log(`Récupération du rapport ${id}`);
      
      const report = await this.reportsService.findOne(id);
      
      this.logger.debug(`Rapport ${id} récupéré avec succès`);
      return new ReportApiResponse(true, 'Rapport récupéré avec succès', report);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du rapport ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors de la récupération du rapport', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Mettre à jour un rapport',
    description: 'Met à jour les informations d\'un rapport existant' 
  })
  @ApiParam({ name: 'id', description: 'ID du rapport' })
  @ApiBody({ type: UpdateReportDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Rapport mis à jour avec succès',
    type: ReportResponseDto 
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateReportDto: UpdateReportDto
  ): Promise<ReportApiResponse<ReportResponseDto>> {
    try {
      this.logger.log(`Mise à jour du rapport ${id}`);
      
      const report = await this.reportsService.update(id, updateReportDto);
      
      this.logger.log(`Rapport ${id} mis à jour avec succès`);
      return new ReportApiResponse(true, 'Rapport mis à jour avec succès', report);
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour du rapport ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors de la mise à jour du rapport', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Supprimer un rapport',
    description: 'Supprime définitivement un rapport et son fichier associé' 
  })
  @ApiParam({ name: 'id', description: 'ID du rapport' })
  @ApiResponse({ 
    status: 200, 
    description: 'Rapport supprimé avec succès' 
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ReportApiResponse<null>> {
    try {
      this.logger.log(`Suppression du rapport ${id}`);
      
      await this.reportsService.remove(id);
      
      this.logger.log(`Rapport ${id} supprimé avec succès`);
      return new ReportApiResponse(true, 'Rapport supprimé avec succès');
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression du rapport ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors de la suppression du rapport', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('download/:id')
  @ApiOperation({ 
    summary: 'Télécharger un rapport',
    description: 'Télécharge le fichier d\'un rapport terminé' 
  })
  @ApiParam({ name: 'id', description: 'ID du rapport' })
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      this.logger.log(`Téléchargement du rapport ${id}`);
      
      const { filePath, fileName, mimeType } = await this.reportsService.downloadReport(id);
      
      const file = fs.createReadStream(filePath);
      
      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      return new StreamableFile(file);
    } catch (error) {
      this.logger.error(`Erreur téléchargement rapport ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        new ReportApiResponse(false, 'Erreur lors du téléchargement du rapport', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}