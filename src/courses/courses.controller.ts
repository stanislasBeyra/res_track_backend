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
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto, CourseFilterDto, CourseStatsDto } from './dto/course.dto';
import { Course, CourseStatus } from './entities/course.entity';
import { JwtAuthGuard } from '../auth/guards/wt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

export class CourseApiResponse<T> {
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

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  private readonly logger = new Logger(CoursesController.name);

  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: 'Créer un nouveau cours',
    description: 'Crée un nouveau cours avec les informations fournies',
  })
  @ApiResponse({
    status: 201,
    description: 'Cours créé avec succès',
    type: CourseResponseDto,
  })
  async create(@Body() createCourseDto: CreateCourseDto): Promise<CourseApiResponse<Course>> {
    try {
      this.logger.log(`Création d'un nouveau cours: ${createCourseDto.title}`);

      const course = await this.coursesService.create(createCourseDto);

      return new CourseApiResponse(
        true,
        'Cours créé avec succès',
        course,
      );
    } catch (error) {
      this.logger.error(`Erreur création cours: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la création du cours', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des cours',
    description: 'Récupère la liste des cours avec filtres optionnels',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des cours récupérée avec succès',
    type: [CourseResponseDto],
  })
  async findAll(@Query() filterDto: CourseFilterDto): Promise<CourseApiResponse<Course[]>> {
    try {
      this.logger.log('Récupération de la liste des cours');

      const result = await this.coursesService.findAll(filterDto);

      const response = new CourseApiResponse(
        true,
        `${result.courses.length} cours récupérés avec succès`,
        result.courses,
      );

      response.pagination = {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
      };

      return response;
    } catch (error) {
      this.logger.error(`Erreur récupération cours: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la récupération des cours', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('available')
  @ApiOperation({
    summary: 'Cours disponibles',
    description: 'Récupère la liste des cours disponibles pour inscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Cours disponibles récupérés avec succès',
    type: [CourseResponseDto],
  })
  async findAvailable(): Promise<CourseApiResponse<Course[]>> {
    try {
      this.logger.log('Récupération des cours disponibles');

      const courses = await this.coursesService.getAvailableCourses();

      return new CourseApiResponse(
        true,
        `${courses.length} cours disponibles trouvés`,
        courses,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération cours disponibles: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la récupération des cours disponibles', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Statistiques des cours',
    description: 'Récupère les statistiques détaillées des cours',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
    type: CourseStatsDto,
  })
  async getStatistics(): Promise<CourseApiResponse<CourseStatsDto>> {
    try {
      this.logger.log('Récupération des statistiques des cours');

      const stats = await this.coursesService.getStatistics();

      return new CourseApiResponse(
        true,
        'Statistiques des cours récupérées avec succès',
        stats,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération statistiques: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la récupération des statistiques', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Cours à venir',
    description: 'Récupère les cours qui démarrent dans les prochains jours',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours à venir (défaut: 7)' })
  @ApiResponse({
    status: 200,
    description: 'Cours à venir récupérés avec succès',
    type: [CourseResponseDto],
  })
  async getUpcoming(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ): Promise<CourseApiResponse<Course[]>> {
    try {
      this.logger.log(`Récupération des cours à venir dans ${days} jours`);

      const courses = await this.coursesService.getUpcomingCourses(days);

      return new CourseApiResponse(
        true,
        `${courses.length} cours à venir trouvés`,
        courses,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération cours à venir: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la récupération des cours à venir', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('search')
  @ApiOperation({
    summary: 'Rechercher des cours',
    description: 'Recherche des cours par titre, code ou description',
  })
  @ApiQuery({ name: 'q', description: 'Terme de recherche' })
  @ApiResponse({
    status: 200,
    description: 'Résultats de recherche récupérés avec succès',
    type: [CourseResponseDto],
  })
  async search(@Query('q') query: string): Promise<CourseApiResponse<Course[]>> {
    try {
      this.logger.log(`Recherche de cours: "${query}"`);

      if (!query || query.trim().length < 2) {
        throw new HttpException(
          new CourseApiResponse(false, 'Le terme de recherche doit contenir au moins 2 caractères'),
          HttpStatus.BAD_REQUEST,
        );
      }

      const courses = await this.coursesService.searchCourses(query.trim());

      return new CourseApiResponse(
        true,
        `${courses.length} cours trouvés pour "${query}"`,
        courses,
      );
    } catch (error) {
      this.logger.error(`Erreur recherche cours: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la recherche', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('instructor/:instructorId')
  @ApiOperation({
    summary: 'Cours par instructeur',
    description: 'Récupère tous les cours d\'un instructeur spécifique',
  })
  @ApiParam({ name: 'instructorId', description: 'ID de l\'instructeur' })
  @ApiResponse({
    status: 200,
    description: 'Cours de l\'instructeur récupérés avec succès',
    type: [CourseResponseDto],
  })
  async findByInstructor(
    @Param('instructorId', ParseIntPipe) instructorId: number,
  ): Promise<CourseApiResponse<Course[]>> {
    try {
      this.logger.log(`Récupération des cours pour l'instructeur ID: ${instructorId}`);

      const courses = await this.coursesService.getCoursesByInstructor(instructorId);

      return new CourseApiResponse(
        true,
        `${courses.length} cours trouvés pour l'instructeur`,
        courses,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération cours par instructeur: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la récupération des cours', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('code/:code')
  @ApiOperation({
    summary: 'Cours par code',
    description: 'Récupère un cours par son code unique',
  })
  @ApiParam({ name: 'code', description: 'Code unique du cours' })
  @ApiResponse({
    status: 200,
    description: 'Cours récupéré avec succès',
    type: CourseResponseDto,
  })
  async findByCode(@Param('code') code: string): Promise<CourseApiResponse<Course>> {
    try {
      this.logger.log(`Recherche du cours par code: ${code}`);

      const course = await this.coursesService.findByCode(code);

      return new CourseApiResponse(
        true,
        'Cours récupéré avec succès',
        course,
      );
    } catch (error) {
      this.logger.error(`Erreur recherche cours par code: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la récupération du cours', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détails d\'un cours',
    description: 'Récupère les détails complets d\'un cours spécifique',
  })
  @ApiParam({ name: 'id', description: 'ID du cours' })
  @ApiResponse({
    status: 200,
    description: 'Détails du cours récupérés avec succès',
    type: CourseResponseDto,
  })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CourseApiResponse<Course>> {
    try {
      this.logger.log(`Récupération des détails du cours ID: ${id}`);

      const course = await this.coursesService.findOne(id);

      return new CourseApiResponse(
        true,
        'Détails du cours récupérés avec succès',
        course,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération cours: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la récupération du cours', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: 'Mettre à jour un cours',
    description: 'Met à jour les informations d\'un cours existant',
  })
  @ApiParam({ name: 'id', description: 'ID du cours' })
  @ApiResponse({
    status: 200,
    description: 'Cours mis à jour avec succès',
    type: CourseResponseDto,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<CourseApiResponse<Course>> {
    try {
      this.logger.log(`Mise à jour du cours ID: ${id}`);

      const course = await this.coursesService.update(id, updateCourseDto);

      return new CourseApiResponse(
        true,
        'Cours mis à jour avec succès',
        course,
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour cours: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la mise à jour du cours', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Changer le statut d\'un cours',
    description: 'Change le statut d\'un cours (actif, inactif, annulé, complété)',
  })
  @ApiParam({ name: 'id', description: 'ID du cours' })
  @ApiResponse({
    status: 200,
    description: 'Statut du cours mis à jour avec succès',
    type: CourseResponseDto,
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: CourseStatus,
  ): Promise<CourseApiResponse<Course>> {
    try {
      this.logger.log(`Mise à jour du statut du cours ID: ${id} vers ${status}`);

      const course = await this.coursesService.updateStatus(id, status);

      return new CourseApiResponse(
        true,
        `Statut du cours mis à jour vers ${status}`,
        course,
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour statut: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la mise à jour du statut', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/duplicate')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: 'Dupliquer un cours',
    description: 'Crée une copie d\'un cours existant avec un nouveau code',
  })
  @ApiParam({ name: 'id', description: 'ID du cours à dupliquer' })
  @ApiResponse({
    status: 201,
    description: 'Cours dupliqué avec succès',
    type: CourseResponseDto,
  })
  async duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newCode: string; newTitle?: string },
  ): Promise<CourseApiResponse<Course>> {
    try {
      this.logger.log(`Duplication du cours ID: ${id}`);

      if (!body.newCode) {
        throw new HttpException(
          new CourseApiResponse(false, 'Le nouveau code est requis'),
          HttpStatus.BAD_REQUEST,
        );
      }

      const course = await this.coursesService.duplicateCourse(id, body.newCode, body.newTitle);

      return new CourseApiResponse(
        true,
        'Cours dupliqué avec succès',
        course,
      );
    } catch (error) {
      this.logger.error(`Erreur duplication cours: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la duplication du cours', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Supprimer un cours',
    description: 'Supprime définitivement un cours (impossible si des étudiants sont inscrits)',
  })
  @ApiParam({ name: 'id', description: 'ID du cours' })
  @ApiResponse({
    status: 200,
    description: 'Cours supprimé avec succès',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<CourseApiResponse<null>> {
    try {
      this.logger.log(`Suppression du cours ID: ${id}`);

      await this.coursesService.remove(id);

      return new CourseApiResponse(
        true,
        'Cours supprimé avec succès',
        null,
      );
    } catch (error) {
      this.logger.error(`Erreur suppression cours: ${error.message}`, error.stack);
      throw new HttpException(
        new CourseApiResponse(false, 'Erreur lors de la suppression du cours', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}