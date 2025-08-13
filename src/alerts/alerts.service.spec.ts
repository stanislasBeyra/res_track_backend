
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert, AlertType } from './entities/alert.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { AlertResponseDto } from './dto/alert-response.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private alertsRepository: Repository<Alert>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createAlertDto: CreateAlertDto): Promise<AlertResponseDto> {
    // Vérifier que l'étudiant existe
    const student = await this.studentsRepository.findOne({
      where: { id: createAlertDto.studentId },
      relations: ['user', 'user.profile'],
    });

    if (!student) {
      throw new NotFoundException('Étudiant non trouvé');
    }

    // Créer l'alerte
    const alert = this.alertsRepository.create(createAlertDto);
    const savedAlert = await this.alertsRepository.save(alert);

    // Créer une notification pour l'étudiant
    await this.notificationsService.createAlertNotification(
      createAlertDto.studentId,
      `Nouvelle alerte ${this.getAlertTypeLabel(createAlertDto.type)}: ${createAlertDto.message}`
    );

    return await this.findOne(savedAlert.id);
  }

  async findAll(): Promise<AlertResponseDto[]> {
    const alerts = await this.alertsRepository.find({
      relations: ['student', 'student.user', 'student.user.profile'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(alerts.map(alert => this.formatAlertResponse(alert)));
  }

  async findByStudentId(studentId: number): Promise<AlertResponseDto[]> {
    const alerts = await this.alertsRepository.find({
      where: { studentId },
      relations: ['student', 'student.user', 'student.user.profile'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(alerts.map(alert => this.formatAlertResponse(alert)));
  }

  async findUnresolved(): Promise<AlertResponseDto[]> {
    const alerts = await this.alertsRepository.find({
      where: { resolved: false },
      relations: ['student', 'student.user', 'student.user.profile'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(alerts.map(alert => this.formatAlertResponse(alert)));
  }

  async findByType(type: AlertType): Promise<AlertResponseDto[]> {
    const alerts = await this.alertsRepository.find({
      where: { type },
      relations: ['student', 'student.user', 'student.user.profile'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(alerts.map(alert => this.formatAlertResponse(alert)));
  }

  async findOne(id: number): Promise<AlertResponseDto> {
    const alert = await this.alertsRepository.findOne({
      where: { id },
      relations: ['student', 'student.user', 'student.user.profile'],
    });

    if (!alert) {
      throw new NotFoundException('Alerte non trouvée');
    }

    return await this.formatAlertResponse(alert);
  }

  async update(id: number, updateAlertDto: UpdateAlertDto): Promise<AlertResponseDto> {
    const alert = await this.alertsRepository.findOne({ where: { id } });
    
    if (!alert) {
      throw new NotFoundException('Alerte non trouvée');
    }

    // Si on résout l'alerte, définir resolvedAt
    if (updateAlertDto.resolved === true && !alert.resolved) {
      updateAlertDto['resolvedAt'] = new Date();
    }

    await this.alertsRepository.update(id, updateAlertDto);
    return await this.findOne(id);
  }

  async resolve(id: number, resolvedBy: number): Promise<AlertResponseDto> {
    return await this.update(id, { resolved: true, resolvedBy });
  }

  async remove(id: number): Promise<void> {
    const alert = await this.alertsRepository.findOne({ where: { id } });
    
    if (!alert) {
      throw new NotFoundException('Alerte non trouvée');
    }

    await this.alertsRepository.delete(id);
  }

  async getStatistics(): Promise<any> {
    const total = await this.alertsRepository.count();
    const resolved = await this.alertsRepository.count({ where: { resolved: true } });
    const unresolved = await this.alertsRepository.count({ where: { resolved: false } });

    const typeStats = await this.alertsRepository
      .createQueryBuilder('alert')
      .select('alert.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('alert.type')
      .getRawMany();

    return {
      total,
      resolved,
      unresolved,
      byType: typeStats.reduce((acc, stat) => {
        acc[stat.type] = parseInt(stat.count);
        return acc;
      }, {}),
    };
  }

  private async formatAlertResponse(alert: Alert): Promise<AlertResponseDto> {
    const response: AlertResponseDto = {
      id: alert.id,
      studentId: alert.studentId,
      type: alert.type,
      message: alert.message,
      resolved: alert.resolved,
      createdAt: alert.createdAt,
      resolvedAt: alert.resolvedAt,
      resolvedBy: alert.resolvedBy,
    };

    if (alert.student) {
      response.student = {
        id: alert.student.id,
        studentNumber: alert.student.studentNumber,
        class: alert.student.class,
        user: {
          profile: {
            firstName: alert.student.user?.profile?.firstName || '',
            lastName: alert.student.user?.profile?.lastName || '',
          },
        },
      };
    }

    if (alert.resolvedBy) {
      const resolver = await this.usersRepository.findOne({
        where: { id: alert.resolvedBy },
        relations: ['profile'],
      });

      if (resolver) {
        response.resolver = {
          id: resolver.id,
          username: resolver.username,
          profile: {
            firstName: resolver.profile?.firstName || '',
            lastName: resolver.profile?.lastName || '',
          },
        };
      }
    }

    return response;
  }

  private getAlertTypeLabel(type: AlertType): string {
    const labels = {
      [AlertType.LATE]: 'Retard',
      [AlertType.ABSENCE]: 'Absence',
      [AlertType.BEHAVIOR]: 'Comportement',
      [AlertType.PERFORMANCE]: 'Performance',
      [AlertType.OTHER]: 'Autre',
    };
    return labels[type] || type;
  }
}