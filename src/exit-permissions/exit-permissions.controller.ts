import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExitPermissionsService } from './exit-permissions.service';
import { CreateExitPermissionDto } from './dto/create-exit-permission.dto';
import { ApproveExitPermissionDto } from './dto/approve-exit-permission.dto';
import { JwtAuthGuard } from '../auth/guards/wt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionStatus } from './entities/exit-permission.entity';
import { UserRole, User } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';

@Controller('exit-permissions')
@UseGuards(JwtAuthGuard)
export class ExitPermissionsController {
  constructor(
    private readonly exitPermissionsService: ExitPermissionsService,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  /**
   * Créer une demande de permission (étudiant)
   */
  @Post()
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  async create(@CurrentUser() user: User, @Body() createDto: CreateExitPermissionDto) {
    // Chercher le student par userId
    const student = await this.studentRepository.findOne({
      where: { userId: user.id }
    });

    if (!student) {
      throw new NotFoundException('Profil étudiant non trouvé. Veuillez contacter l\'administrateur.');
    }

    return this.exitPermissionsService.create(student.id, createDto);
  }

  /**
   * Récupérer toutes les demandes (admin) - avec filtre optionnel par statut
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  findAll(@Query('status') status?: PermissionStatus) {
    return this.exitPermissionsService.findAll(status);
  }

  /**
   * Récupérer les demandes de l'étudiant connecté
   */
  @Get('my-permissions')
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  async findMyPermissions(@CurrentUser() user: User) {
    const student = await this.studentRepository.findOne({
      where: { userId: user.id }
    });

    if (!student) {
      throw new NotFoundException('Profil étudiant non trouvé.');
    }

    return this.exitPermissionsService.findByStudent(student.id);
  }

  /**
   * Vérifier un code de sortie
   */
  @Get('verify/:code')
  verifyCode(@Param('code') code: string) {
    return this.exitPermissionsService.verifyPermission(code);
  }

  /**
   * Récupérer une permission par ID
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exitPermissionsService.findOne(id);
  }

  /**
   * Approuver ou rejeter une demande (admin)
   */
  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() approveDto: ApproveExitPermissionDto,
  ) {
    return this.exitPermissionsService.approve(id, user.id, approveDto);
  }

  /**
   * Supprimer une demande (étudiant - seulement si pending)
   */
  @Delete(':id')
  @Roles(UserRole.STUDENT)
  @UseGuards(RolesGuard)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    const student = await this.studentRepository.findOne({
      where: { userId: user.id }
    });

    if (!student) {
      throw new NotFoundException('Profil étudiant non trouvé.');
    }

    return this.exitPermissionsService.remove(id, student.id);
  }
}
