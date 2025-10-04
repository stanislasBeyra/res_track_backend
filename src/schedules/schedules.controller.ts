import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Logger,
  HttpStatus,
  HttpException,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto, ScheduleResponseDto, ScheduleFilterDto, BulkAttendanceDto, ScheduleStatsDto } from './dto/schedule.dto';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { JwtAuthGuard } from '../auth/guards/wt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

export class ScheduleApiResponse<T> {
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

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  private readonly logger = new Logger(SchedulesController.name);

  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: 'Créer une nouvelle session',
    description: 'Crée une nouvelle session de cours avec planification optionnelle récurrente',
  })
  @ApiResponse({
    status: 201,
    description: 'Session créée avec succès',
    type: ScheduleResponseDto,
  })
  async create(@Body() createScheduleDto: CreateScheduleDto): Promise<ScheduleApiResponse<Schedule>> {
    try {
      this.logger.log(`Création d'une nouvelle session: ${createScheduleDto.title}`);

      const schedule = await this.schedulesService.create(createScheduleDto);

      return new ScheduleApiResponse(
        true,
        'Session créée avec succès',
        schedule,
      );
    } catch (error) {
      this.logger.error(`Erreur création session: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la création de la session', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des sessions',
    description: 'Récupère la liste des sessions programmées avec filtres optionnels',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des sessions récupérée avec succès',
    type: [ScheduleResponseDto],
  })
  async findAll(@Query() filterDto: ScheduleFilterDto): Promise<ScheduleApiResponse<Schedule[]>> {
    try {
      this.logger.log('Récupération de la liste des sessions');

      const result = await this.schedulesService.findAll(filterDto);

      const response = new ScheduleApiResponse(
        true,
        `${result.schedules.length} sessions récupérées avec succès`,
        result.schedules,
      );

      response.pagination = {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
      };

      return response;
    } catch (error) {
      this.logger.error(`Erreur récupération sessions: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la récupération des sessions', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('today')
  @ApiOperation({
    summary: 'Sessions d\'aujourd\'hui',
    description: 'Récupère toutes les sessions programmées pour aujourd\'hui',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions d\'aujourd\'hui récupérées avec succès',
    type: [ScheduleResponseDto],
  })
  async getTodaySchedules(): Promise<ScheduleApiResponse<Schedule[]>> {
    try {
      this.logger.log('Récupération des sessions d\'aujourd\'hui');

      const schedules = await this.schedulesService.getTodaySchedules();

      return new ScheduleApiResponse(
        true,
        `${schedules.length} sessions trouvées pour aujourd'hui`,
        schedules,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération sessions du jour: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la récupération des sessions du jour', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Sessions à venir',
    description: 'Récupère les sessions à venir dans les prochains jours',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours à venir (défaut: 7)' })
  @ApiResponse({
    status: 200,
    description: 'Sessions à venir récupérées avec succès',
    type: [ScheduleResponseDto],
  })
  async getUpcoming(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ): Promise<ScheduleApiResponse<Schedule[]>> {
    try {
      this.logger.log(`Récupération des sessions à venir dans ${days} jours`);

      const schedules = await this.schedulesService.getUpcomingSchedules(days);

      return new ScheduleApiResponse(
        true,
        `${schedules.length} sessions à venir trouvées`,
        schedules,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération sessions à venir: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la récupération des sessions à venir', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Statistiques des sessions',
    description: 'Récupère les statistiques détaillées des sessions et présences',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
    type: ScheduleStatsDto,
  })
  async getStatistics(): Promise<ScheduleApiResponse<ScheduleStatsDto>> {
    try {
      this.logger.log('Récupération des statistiques des sessions');

      const stats = await this.schedulesService.getStatistics();

      return new ScheduleApiResponse(
        true,
        'Statistiques des sessions récupérées avec succès',
        stats,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération statistiques: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la récupération des statistiques', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('course/:courseId')
  @ApiOperation({
    summary: 'Sessions par cours',
    description: 'Récupère toutes les sessions d\'un cours spécifique',
  })
  @ApiParam({ name: 'courseId', description: 'ID du cours' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Date de début (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Date de fin (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Sessions du cours récupérées avec succès',
    type: [ScheduleResponseDto],
  })
  async findByCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<ScheduleApiResponse<Schedule[]>> {
    try {
      this.logger.log(`Récupération des sessions pour le cours ID: ${courseId}`);

      const schedules = await this.schedulesService.getSchedulesByCourse(courseId, dateFrom, dateTo);

      return new ScheduleApiResponse(
        true,
        `${schedules.length} sessions trouvées pour le cours`,
        schedules,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération sessions par cours: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la récupération des sessions', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('instructor/:instructorId')
  @ApiOperation({
    summary: 'Sessions par instructeur',
    description: 'Récupère toutes les sessions d\'un instructeur spécifique',
  })
  @ApiParam({ name: 'instructorId', description: 'ID de l\'instructeur' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Date de début (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Date de fin (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Sessions de l\'instructeur récupérées avec succès',
    type: [ScheduleResponseDto],
  })
  async findByInstructor(
    @Param('instructorId', ParseIntPipe) instructorId: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<ScheduleApiResponse<Schedule[]>> {
    try {
      this.logger.log(`Récupération des sessions pour l'instructeur ID: ${instructorId}`);

      const schedules = await this.schedulesService.getSchedulesByInstructor(instructorId, dateFrom, dateTo);

      return new ScheduleApiResponse(
        true,
        `${schedules.length} sessions trouvées pour l'instructeur`,
        schedules,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération sessions par instructeur: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la récupération des sessions', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détails d\'une session',
    description: 'Récupère les détails complets d\'une session spécifique',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Détails de la session récupérés avec succès',
    type: ScheduleResponseDto,
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ScheduleApiResponse<Schedule>> {
    try {
      this.logger.log(`Récupération des détails de la session ID: ${id}`);

      const schedule = await this.schedulesService.findOne(id);

      return new ScheduleApiResponse(
        true,
        'Détails de la session récupérés avec succès',
        schedule,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération session: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la récupération de la session', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: 'Mettre à jour une session',
    description: 'Met à jour les informations d\'une session existante',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session mise à jour avec succès',
    type: ScheduleResponseDto,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ): Promise<ScheduleApiResponse<Schedule>> {
    try {
      this.logger.log(`Mise à jour de la session ID: ${id}`);

      const schedule = await this.schedulesService.update(id, updateScheduleDto);

      return new ScheduleApiResponse(
        true,
        'Session mise à jour avec succès',
        schedule,
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour session: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la mise à jour de la session', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: 'Changer le statut d\'une session',
    description: 'Change le statut d\'une session (actif, annulé, complété, reporté)',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Statut de la session mis à jour avec succès',
    type: ScheduleResponseDto,
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ScheduleStatus,
  ): Promise<ScheduleApiResponse<Schedule>> {
    try {
      this.logger.log(`Mise à jour du statut de la session ID: ${id} vers ${status}`);

      const schedule = await this.schedulesService.updateStatus(id, status);

      return new ScheduleApiResponse(
        true,
        `Statut de la session mis à jour vers ${status}`,
        schedule,
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour statut: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la mise à jour du statut', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/attendance')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: 'Mettre à jour les présences',
    description: 'Met à jour les présences des étudiants pour une session',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Présences mises à jour avec succès',
    type: ScheduleResponseDto,
  })
  async updateAttendance(
    @Param('id', ParseIntPipe) id: number,
    @Body() attendanceDto: BulkAttendanceDto,
  ): Promise<ScheduleApiResponse<Schedule>> {
    try {
      this.logger.log(`Mise à jour des présences pour la session ID: ${id}`);

      const schedule = await this.schedulesService.updateAttendance(id, attendanceDto);

      return new ScheduleApiResponse(
        true,
        'Présences mises à jour avec succès',
        schedule,
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour présences: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la mise à jour des présences', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Supprimer une session',
    description: 'Supprime définitivement une session programmée',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session supprimée avec succès',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<ScheduleApiResponse<null>> {
    try {
      this.logger.log(`Suppression de la session ID: ${id}`);

      await this.schedulesService.remove(id);

      return new ScheduleApiResponse(
        true,
        'Session supprimée avec succès',
        null,
      );
    } catch (error) {
      this.logger.error(`Erreur suppression session: ${error.message}`, error.stack);
      throw new HttpException(
        new ScheduleApiResponse(false, 'Erreur lors de la suppression de la session', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}