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
  ParseEnumPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { AlertResponseDto } from './dto/alert-response.dto';
import { AlertType } from './entities/alert.entity';

// DTO pour les réponses standardisées
export class ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;

  constructor(success: boolean, message: string, data?: T, error?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
}

// DTO pour la création en masse
export class CreateBulkAlertsDto {
  alerts: CreateAlertDto[];
}

// DTO pour les statistiques étendues
export class AlertStatisticsDto {
  total: number;
  resolved: number;
  unresolved: number;
  byType: Record<string, number>;
  resolutionRate: number;
  averageResolutionTime?: number;
}

@Controller('alerts')
export class AlertsController {
  private readonly logger = new Logger(AlertsController.name);

  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  async create(@Body(ValidationPipe) createAlertDto: CreateAlertDto): Promise<ApiResponse<AlertResponseDto>> {
    try {
      this.logger.log(`Requête de création d'alerte - Étudiant: ${createAlertDto.studentId}, Type: ${createAlertDto.type}`);
      
      const alert = await this.alertsService.create(createAlertDto);
      
      this.logger.log(`Alerte créée avec succès - ID: ${alert.id}`);
      return new ApiResponse(true, 'Alerte créée avec succès', alert);
    } catch (error) {
      this.logger.error(`Erreur lors de la création d'alerte: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la création de l\'alerte', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('bulk')
  async createBulk(@Body(ValidationPipe) createBulkDto: CreateBulkAlertsDto): Promise<ApiResponse<AlertResponseDto[]>> {
    try {
      this.logger.log(`Requête de création en masse de ${createBulkDto.alerts.length} alerte(s)`);
      
      if (!createBulkDto.alerts || createBulkDto.alerts.length === 0) {
        throw new BadRequestException('La liste des alertes ne peut pas être vide');
      }

      if (createBulkDto.alerts.length > 50) {
        throw new BadRequestException('Impossible de créer plus de 50 alertes à la fois');
      }

      const alerts = await this.alertsService.createBulkAlerts(createBulkDto.alerts);
      
      this.logger.log(`${alerts.length} alerte(s) créée(s) en masse avec succès`);
      return new ApiResponse(true, `${alerts.length} alerte(s) créée(s) avec succès`, alerts);
    } catch (error) {
      this.logger.error(`Erreur lors de la création en masse d'alertes: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la création en masse des alertes', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  async findAll(
    @Query('studentId', new DefaultValuePipe(null)) studentId?: number,
    @Query('type') type?: AlertType,
    @Query('resolved', new DefaultValuePipe(null)) resolved?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20
  ): Promise<ApiResponse<AlertResponseDto[]>> {
    try {
      this.logger.log(`Requête de récupération d'alertes - Filtres: studentId=${studentId}, type=${type}, resolved=${resolved}`);
      
      // Validation des paramètres de pagination
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;

      let alerts: AlertResponseDto[] = [];

      if (studentId) {
        alerts = await this.alertsService.findByStudentId(Number(studentId));
      } else if (type) {
        // Validation de l'enum AlertType
        if (!Object.values(AlertType).includes(type)) {
          throw new BadRequestException(`Type d'alerte invalide: ${type}`);
        }
        alerts = await this.alertsService.findByType(type);
      } else if (resolved === 'false') {
        alerts = await this.alertsService.findUnresolved();
      } else {
        alerts = await this.alertsService.findAll();
      }

      // Pagination simple côté application (pour de petits datasets)
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAlerts = alerts.slice(startIndex, endIndex);

      this.logger.debug(`${paginatedAlerts.length} alerte(s) récupérée(s) (page ${page}/${Math.ceil(alerts.length / limit)})`);
      
      return new ApiResponse(
        true, 
        `${paginatedAlerts.length} alerte(s) récupérée(s)`, 
        paginatedAlerts
      );
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des alertes: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la récupération des alertes', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('statistics')
  async getStatistics(): Promise<ApiResponse<AlertStatisticsDto>> {
    try {
      this.logger.log('Requête de statistiques des alertes');
      
      const baseStats = await this.alertsService.getStatistics();
      
      // Calcul du taux de résolution
      const resolutionRate = baseStats.total > 0 
        ? Math.round((baseStats.resolved / baseStats.total) * 100) 
        : 0;

      const extendedStats: AlertStatisticsDto = {
        ...baseStats,
        resolutionRate
      };

      this.logger.debug(`Statistiques calculées: ${JSON.stringify(extendedStats)}`);
      return new ApiResponse(true, 'Statistiques récupérées avec succès', extendedStats);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des statistiques: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la récupération des statistiques', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('student/:studentId/count')
  async getStudentAlertsCount(
    @Param('studentId', ParseIntPipe) studentId: number
  ): Promise<ApiResponse<{ total: number; resolved: number; unresolved: number }>> {
    try {
      this.logger.log(`Requête de comptage d'alertes pour l'étudiant: ${studentId}`);
      
      const count = await this.alertsService.getAlertsCountByStudent(studentId);
      
      this.logger.debug(`Comptage pour l'étudiant ${studentId}: ${JSON.stringify(count)}`);
      return new ApiResponse(true, 'Comptage récupéré avec succès', count);
    } catch (error) {
      this.logger.error(`Erreur lors du comptage pour l'étudiant ${studentId}: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors du comptage des alertes', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('types')
  async getAlertTypes(): Promise<ApiResponse<{ types: AlertType[]; labels: Record<string, string> }>> {
    try {
      this.logger.log('Requête de récupération des types d\'alertes');
      
      const types = Object.values(AlertType);
      const labels = {
        [AlertType.LATE]: 'Retard',
        [AlertType.ABSENCE]: 'Absence',
        [AlertType.BEHAVIOR]: 'Comportement',
        [AlertType.PERFORMANCE]: 'Performance',
        [AlertType.OTHER]: 'Autre',
      };

      return new ApiResponse(true, 'Types d\'alertes récupérés', { types, labels });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des types: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la récupération des types', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<AlertResponseDto>> {
    try {
      this.logger.log(`Requête de récupération de l'alerte: ${id}`);
      
      const alert = await this.alertsService.findOne(id);
      
      this.logger.debug(`Alerte ${id} récupérée avec succès`);
      return new ApiResponse(true, 'Alerte récupérée avec succès', alert);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'alerte ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la récupération de l\'alerte', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateAlertDto: UpdateAlertDto
  ): Promise<ApiResponse<AlertResponseDto>> {
    try {
      this.logger.log(`Requête de mise à jour de l'alerte: ${id}`);
      
      const alert = await this.alertsService.update(id, updateAlertDto);
      
      this.logger.log(`Alerte ${id} mise à jour avec succès`);
      return new ApiResponse(true, 'Alerte mise à jour avec succès', alert);
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour de l'alerte ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la mise à jour de l\'alerte', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id/resolve')
  async resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body('resolvedBy', ParseIntPipe) resolvedBy: number
  ): Promise<ApiResponse<AlertResponseDto>> {
    try {
      this.logger.log(`Requête de résolution de l'alerte: ${id} par l'utilisateur: ${resolvedBy}`);
      
      if (!resolvedBy || resolvedBy <= 0) {
        throw new BadRequestException('L\'ID de l\'utilisateur résolveur est requis et doit être valide');
      }

      const alert = await this.alertsService.resolve(id, resolvedBy);
      
      this.logger.log(`Alerte ${id} résolue avec succès par l'utilisateur ${resolvedBy}`);
      return new ApiResponse(true, 'Alerte résolue avec succès', alert);
    } catch (error) {
      this.logger.error(`Erreur lors de la résolution de l'alerte ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la résolution de l\'alerte', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch('bulk/resolve')
  async resolveBulk(
    @Body() body: { alertIds: number[]; resolvedBy: number }
  ): Promise<ApiResponse<{ resolved: number; errors: string[] }>> {
    try {
      this.logger.log(`Requête de résolution en masse de ${body.alertIds?.length || 0} alerte(s)`);
      
      if (!body.alertIds || body.alertIds.length === 0) {
        throw new BadRequestException('La liste des IDs d\'alertes ne peut pas être vide');
      }

      if (!body.resolvedBy || body.resolvedBy <= 0) {
        throw new BadRequestException('L\'ID de l\'utilisateur résolveur est requis');
      }

      if (body.alertIds.length > 20) {
        throw new BadRequestException('Impossible de résoudre plus de 20 alertes à la fois');
      }

      let resolved = 0;
      const errors: string[] = [];

      for (const alertId of body.alertIds) {
        try {
          await this.alertsService.resolve(alertId, body.resolvedBy);
          resolved++;
        } catch (error) {
          errors.push(`Alerte ${alertId}: ${error.message}`);
        }
      }

      this.logger.log(`Résolution en masse terminée: ${resolved} succès, ${errors.length} erreurs`);
      return new ApiResponse(
        true, 
        `${resolved} alerte(s) résolue(s) avec succès`, 
        { resolved, errors }
      );
    } catch (error) {
      this.logger.error(`Erreur lors de la résolution en masse: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la résolution en masse', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse<null>> {
    try {
      this.logger.log(`Requête de suppression de l'alerte: ${id}`);
      
      await this.alertsService.remove(id);
      
      this.logger.log(`Alerte ${id} supprimée avec succès`);
      return new ApiResponse(true, 'Alerte supprimée avec succès');
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de l'alerte ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la suppression de l\'alerte', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('bulk')
  async removeBulk(@Body() body: { alertIds: number[] }): Promise<ApiResponse<{ deleted: number; errors: string[] }>> {
    try {
      this.logger.log(`Requête de suppression en masse de ${body.alertIds?.length || 0} alerte(s)`);
      
      if (!body.alertIds || body.alertIds.length === 0) {
        throw new BadRequestException('La liste des IDs d\'alertes ne peut pas être vide');
      }

      if (body.alertIds.length > 20) {
        throw new BadRequestException('Impossible de supprimer plus de 20 alertes à la fois');
      }

      let deleted = 0;
      const errors: string[] = [];

      for (const alertId of body.alertIds) {
        try {
          await this.alertsService.remove(alertId);
          deleted++;
        } catch (error) {
          errors.push(`Alerte ${alertId}: ${error.message}`);
        }
      }

      this.logger.log(`Suppression en masse terminée: ${deleted} succès, ${errors.length} erreurs`);
      return new ApiResponse(
        true, 
        `${deleted} alerte(s) supprimée(s) avec succès`, 
        { deleted, errors }
      );
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression en masse: ${error.message}`, error.stack);
      throw new HttpException(
        new ApiResponse(false, 'Erreur lors de la suppression en masse', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}