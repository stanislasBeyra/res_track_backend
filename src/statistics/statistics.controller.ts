import { 
  Controller, 
  Get, 
  Query, 
  Logger,
  HttpStatus,
  HttpException,
  UseGuards,
  ParseEnumPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiQuery 
} from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { DashboardOverviewDto, StudentStatisticsDto, AbsenceStatisticsDto, PerformanceTrendsDto, AlertStatisticsDto } from './dto/dashboard-stats.dto';
import { StatisticType, StatisticPeriod } from './entities/statistic.entity';
import { JwtAuthGuard } from '../auth/guards/wt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

// DTO pour les réponses standardisées
export class StatisticApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
  metadata?: {
    generatedAt: string;
    cacheValid: boolean;
    nextUpdate?: string;
  };

  constructor(success: boolean, message: string, data?: T, error?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
}

@ApiTags('Statistics')
@ApiBearerAuth()
@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  private readonly logger = new Logger(StatisticsController.name);

  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  @ApiOperation({ 
    summary: 'Vue d\'ensemble du tableau de bord',
    description: 'Retourne les statistiques principales pour le tableau de bord' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistiques du tableau de bord récupérées avec succès',
    type: DashboardOverviewDto 
  })
  async getOverview(): Promise<StatisticApiResponse<DashboardOverviewDto>> {
    try {
      this.logger.log('Requête de statistiques du tableau de bord');
      
      const overview = await this.statisticsService.getDashboardOverview();
      
      const response = new StatisticApiResponse(
        true, 
        'Statistiques du tableau de bord récupérées avec succès', 
        overview
      );
      response.metadata = {
        generatedAt: new Date().toISOString(),
        cacheValid: true,
        nextUpdate: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
      };

      return response;
    } catch (error) {
      this.logger.error(`Erreur récupération overview: ${error.message}`, error.stack);
      throw new HttpException(
        new StatisticApiResponse(false, 'Erreur lors de la récupération des statistiques', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('students/active-inactive')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Répartition des étudiants actifs/inactifs',
    description: 'Statistiques détaillées sur les étudiants' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistiques étudiants récupérées avec succès',
    type: StudentStatisticsDto 
  })
  async getStudentStatistics(): Promise<StatisticApiResponse<StudentStatisticsDto>> {
    try {
      this.logger.log('Requête de statistiques des étudiants');
      
      const stats = await this.statisticsService.getStudentStatistics();
      
      return new StatisticApiResponse(
        true, 
        'Statistiques des étudiants récupérées avec succès', 
        stats
      );
    } catch (error) {
      this.logger.error(`Erreur récupération stats étudiants: ${error.message}`, error.stack);
      throw new HttpException(
        new StatisticApiResponse(false, 'Erreur lors de la récupération des statistiques étudiants', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('absences/by-period')
  @ApiOperation({ 
    summary: 'Absences par période',
    description: 'Statistiques détaillées des absences par période' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistiques absences récupérées avec succès',
    type: AbsenceStatisticsDto 
  })
  async getAbsenceStatistics(): Promise<StatisticApiResponse<AbsenceStatisticsDto>> {
    try {
      this.logger.log('Requête de statistiques des absences');
      
      const stats = await this.statisticsService.getAbsenceStatistics();
      
      return new StatisticApiResponse(
        true, 
        'Statistiques des absences récupérées avec succès', 
        stats
      );
    } catch (error) {
      this.logger.error(`Erreur récupération stats absences: ${error.message}`, error.stack);
      throw new HttpException(
        new StatisticApiResponse(false, 'Erreur lors de la récupération des statistiques d\'absences', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('performance/trends')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Tendances de performance',
    description: 'Analyse des tendances de performance sur plusieurs périodes' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tendances de performance récupérées avec succès',
    type: PerformanceTrendsDto 
  })
  async getPerformanceTrends(): Promise<StatisticApiResponse<PerformanceTrendsDto>> {
    try {
      this.logger.log('Requête de tendances de performance');
      
      const trends = await this.statisticsService.getPerformanceTrends();
      
      return new StatisticApiResponse(
        true, 
        'Tendances de performance récupérées avec succès', 
        trends
      );
    } catch (error) {
      this.logger.error(`Erreur récupération tendances: ${error.message}`, error.stack);
      throw new HttpException(
        new StatisticApiResponse(false, 'Erreur lors de la récupération des tendances de performance', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('alerts/summary')
  @ApiOperation({ 
    summary: 'Résumé des statistiques d\'alertes',
    description: 'Statistiques complètes sur les alertes et leur résolution' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistiques alertes récupérées avec succès',
    type: AlertStatisticsDto 
  })
  async getAlertStatistics(): Promise<StatisticApiResponse<AlertStatisticsDto>> {
    try {
      this.logger.log('Requête de statistiques des alertes');
      
      const stats = await this.statisticsService.getAlertStatistics();
      
      return new StatisticApiResponse(
        true, 
        'Statistiques des alertes récupérées avec succès', 
        stats
      );
    } catch (error) {
      this.logger.error(`Erreur récupération stats alertes: ${error.message}`, error.stack);
      throw new HttpException(
        new StatisticApiResponse(false, 'Erreur lors de la récupération des statistiques d\'alertes', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('historical')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Statistiques historiques',
    description: 'Récupère les statistiques historiques par type et période' 
  })
  @ApiQuery({ name: 'type', enum: StatisticType, description: 'Type de statistique' })
  @ApiQuery({ name: 'startDate', description: 'Date de début (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', description: 'Date de fin (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistiques historiques récupérées avec succès' 
  })
  async getHistoricalStatistics(
    @Query('type', new ParseEnumPipe(StatisticType)) type: StatisticType,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<StatisticApiResponse<any[]>> {
    try {
      this.logger.log(`Requête de statistiques historiques: ${type} du ${startDate} au ${endDate}`);
      
      if (!startDate || !endDate) {
        throw new HttpException(
          new StatisticApiResponse(false, 'Les dates de début et fin sont requises'),
          HttpStatus.BAD_REQUEST
        );
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        throw new HttpException(
          new StatisticApiResponse(false, 'La date de début doit être antérieure à la date de fin'),
          HttpStatus.BAD_REQUEST
        );
      }

      const statistics = await this.statisticsService.getHistoricalStatistics(type, start, end);
      
      return new StatisticApiResponse(
        true, 
        `${statistics.length} statistique(s) historique(s) récupérée(s)`, 
        statistics
      );
    } catch (error) {
      this.logger.error(`Erreur récupération stats historiques: ${error.message}`, error.stack);
      throw new HttpException(
        new StatisticApiResponse(false, 'Erreur lors de la récupération des statistiques historiques', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('cache/refresh')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Actualiser le cache des statistiques',
    description: 'Force la régénération du cache des statistiques' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cache des statistiques actualisé avec succès' 
  })
  async refreshCache(): Promise<StatisticApiResponse<null>> {
    try {
      this.logger.log('Actualisation du cache des statistiques');
      
      // Régénérer toutes les statistiques principales
      await Promise.all([
        this.statisticsService.getDashboardOverview(),
        this.statisticsService.getStudentStatistics(),
        this.statisticsService.getAbsenceStatistics(),
        this.statisticsService.getPerformanceTrends(),
        this.statisticsService.getAlertStatistics(),
      ]);
      
      this.logger.log('Cache des statistiques actualisé avec succès');
      return new StatisticApiResponse(true, 'Cache des statistiques actualisé avec succès');
    } catch (error) {
      this.logger.error(`Erreur actualisation cache: ${error.message}`, error.stack);
      throw new HttpException(
        new StatisticApiResponse(false, 'Erreur lors de l\'actualisation du cache', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Santé du module statistiques',
    description: 'Vérifications de santé du système de statistiques' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'État de santé du module statistiques' 
  })
  async getHealth(): Promise<StatisticApiResponse<any>> {
    try {
      this.logger.log('Vérification de santé du module statistiques');
      
      const startTime = Date.now();
      
      // Tests de santé basiques
      const healthChecks = await Promise.allSettled([
        this.statisticsService.getDashboardOverview(),
        // Autres vérifications...
      ]);

      const responseTime = Date.now() - startTime;
      const failedChecks = healthChecks.filter(check => check.status === 'rejected').length;
      
      const health = {
        status: failedChecks === 0 ? 'healthy' : 'degraded',
        responseTime: `${responseTime}ms`,
        checks: {
          total: healthChecks.length,
          passed: healthChecks.length - failedChecks,
          failed: failedChecks,
        },
        timestamp: new Date().toISOString(),
      };
      
      return new StatisticApiResponse(true, 'Vérification de santé terminée', health);
    } catch (error) {
      this.logger.error(`Erreur vérification santé: ${error.message}`, error.stack);
      throw new HttpException(
        new StatisticApiResponse(false, 'Erreur lors de la vérification de santé', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}