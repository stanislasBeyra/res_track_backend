import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../auth/guards/wt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MovementType } from './entities/movement.entity';
import { UserRole, User } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';

@Controller('movements')
@UseGuards(JwtAuthGuard)
export class MovementsController {
  constructor(
    private readonly movementsService: MovementsService,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  /**
   * Enregistrer un mouvement (admin/gardien)
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  create(@CurrentUser() user: User, @Body() createDto: CreateMovementDto) {
    return this.movementsService.create(createDto, user.id);
  }

  /**
   * Scanner un code (QR ou manuel) pour enregistrer un mouvement
   * Cette route peut être publique ou protégée selon votre choix
   */
  @Post('scan')
  scan(@Body() createDto: CreateMovementDto) {
    return this.movementsService.create(createDto);
  }

  /**
   * Récupérer tous les mouvements avec filtres
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  findAll(
    @Query('studentId', new ParseIntPipe({ optional: true })) studentId?: number,
    @Query('type') type?: MovementType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.movementsService.findAll(studentId, type, start, end);
  }

  /**
   * Récupérer les mouvements de l'étudiant connecté
   */
  @Get('my-movements')
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  async findMyMovements(@CurrentUser() user: User) {
    const student = await this.studentRepository.findOne({
      where: { userId: user.id }
    });

    if (!student) {
      throw new NotFoundException('Profil étudiant non trouvé.');
    }

    return this.movementsService.findByStudent(student.id);
  }

  /**
   * Récupérer les étudiants actuellement dans la résidence
   */
  @Get('in-residence')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  getStudentsInResidence() {
    return this.movementsService.getStudentsInResidence();
  }

  /**
   * Récupérer les étudiants actuellement hors résidence
   */
  @Get('out-residence')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  getStudentsOutResidence() {
    return this.movementsService.getStudentsOutResidence();
  }

  /**
   * Statistiques des mouvements
   */
  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.movementsService.getStatistics(start, end);
  }

  /**
   * Récupérer un mouvement par ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.movementsService.findOne(id);
  }
}
