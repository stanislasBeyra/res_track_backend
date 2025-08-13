import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AlertsService.name);

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
    try {
      this.logger.log(`Création d'alerte - Étudiant ID: ${createAlertDto.studentId}, Type: ${createAlertDto.type}`);
      
      // Vérifier que l'étudiant existe
      const student = await this.studentsRepository.findOne({
        where: { id: createAlertDto.studentId },
        relations: ['user', 'user.profile'],
      });

      if (!student) {
        this.logger.warn(`Étudiant avec l'ID ${createAlertDto.studentId} non trouvé`);
        throw new NotFoundException(`Étudiant avec l'ID ${createAlertDto.studentId} non trouvé`);
      }

      this.logger.debug(`Étudiant trouvé: ${student.studentNumber} - ${student.user?.profile?.firstName} ${student.user?.profile?.lastName}`);

      // Créer l'alerte
      const alert = this.alertsRepository.create(createAlertDto);
      const savedAlert = await this.alertsRepository.save(alert);
      
      this.logger.log(`Alerte créée avec l'ID: ${savedAlert.id}`);

      // Créer une notification pour l'étudiant
      try {
        await this.notificationsService.createAlertNotification(
          createAlertDto.studentId,
          `Nouvelle alerte ${this.getAlertTypeLabel(createAlertDto.type)}: ${createAlertDto.message}`
        );
        this.logger.debug(`Notification d'alerte créée pour l'étudiant ${createAlertDto.studentId}`);
      } catch (notificationError) {
        this.logger.warn(`Erreur lors de la création de la notification pour l'alerte ${savedAlert.id}: ${notificationError.message}`);
        // L'alerte est créée même si la notification échoue
      }

      return await this.findOne(savedAlert.id);
    } catch (error) {
      this.logger.error(`Erreur lors de la création de l'alerte: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erreur lors de la création de l\'alerte');
    }
  }

  async findAll(): Promise<AlertResponseDto[]> {
    try {
      this.logger.log('Récupération de toutes les alertes');
      
      const alerts = await this.alertsRepository.find({
        relations: ['student', 'student.user', 'student.user.profile'],
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(`${alerts.length} alerte(s) trouvée(s)`);
      return await Promise.all(alerts.map(alert => this.formatAlertResponse(alert)));
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des alertes: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des alertes');
    }
  }

  async findByStudentId(studentId: number): Promise<AlertResponseDto[]> {
    try {
      this.logger.log(`Récupération des alertes pour l'étudiant ID: ${studentId}`);
      
      const alerts = await this.alertsRepository.find({
        where: { studentId },
        relations: ['student', 'student.user', 'student.user.profile'],
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(`${alerts.length} alerte(s) trouvée(s) pour l'étudiant ${studentId}`);
      return await Promise.all(alerts.map(alert => this.formatAlertResponse(alert)));
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des alertes pour l'étudiant ${studentId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors de la récupération des alertes pour l'étudiant ${studentId}`);
    }
  }

  async findUnresolved(): Promise<AlertResponseDto[]> {
    try {
      this.logger.log('Récupération des alertes non résolues');
      
      const alerts = await this.alertsRepository.find({
        where: { resolved: false },
        relations: ['student', 'student.user', 'student.user.profile'],
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(`${alerts.length} alerte(s) non résolue(s) trouvée(s)`);
      return await Promise.all(alerts.map(alert => this.formatAlertResponse(alert)));
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des alertes non résolues: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des alertes non résolues');
    }
  }

  async findByType(type: AlertType): Promise<AlertResponseDto[]> {
    try {
      this.logger.log(`Récupération des alertes de type: ${type}`);
      
      const alerts = await this.alertsRepository.find({
        where: { type },
        relations: ['student', 'student.user', 'student.user.profile'],
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(`${alerts.length} alerte(s) de type ${type} trouvée(s)`);
      return await Promise.all(alerts.map(alert => this.formatAlertResponse(alert)));
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des alertes de type ${type}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors de la récupération des alertes de type ${type}`);
    }
  }

  async findOne(id: number): Promise<AlertResponseDto> {
    try {
      this.logger.log(`Récupération de l'alerte ID: ${id}`);
      
      const alert = await this.alertsRepository.findOne({
        where: { id },
        relations: ['student', 'student.user', 'student.user.profile'],
      });

      if (!alert) {
        this.logger.warn(`Alerte avec l'ID ${id} non trouvée`);
        throw new NotFoundException(`Alerte avec l'ID ${id} non trouvée`);
      }

      this.logger.debug(`Alerte ${id} récupérée avec succès`);
      return await this.formatAlertResponse(alert);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'alerte ${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erreur lors de la récupération de l'alerte ${id}`);
    }
  }

  async update(id: number, updateAlertDto: UpdateAlertDto): Promise<AlertResponseDto> {
    try {
      this.logger.log(`Mise à jour de l'alerte ID: ${id} - Données: ${JSON.stringify(updateAlertDto)}`);
      
      const alert = await this.alertsRepository.findOne({ where: { id } });
      
      if (!alert) {
        this.logger.warn(`Alerte avec l'ID ${id} non trouvée pour mise à jour`);
        throw new NotFoundException(`Alerte avec l'ID ${id} non trouvée`);
      }

      // Si on résout l'alerte, définir resolvedAt
      if (updateAlertDto.resolved === true && !alert.resolved) {
        updateAlertDto['resolvedAt'] = new Date();
        this.logger.debug(`Alerte ${id} marquée comme résolue`);
      }

      await this.alertsRepository.update(id, updateAlertDto);
      this.logger.log(`Alerte ${id} mise à jour avec succès`);
      
      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour de l'alerte ${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erreur lors de la mise à jour de l'alerte ${id}`);
    }
  }

  async resolve(id: number, resolvedBy: number): Promise<AlertResponseDto> {
    try {
      this.logger.log(`Résolution de l'alerte ID: ${id} par l'utilisateur ID: ${resolvedBy}`);
      
      // Vérifier que l'utilisateur qui résout existe
      const resolver = await this.usersRepository.findOne({ where: { id: resolvedBy } });
      if (!resolver) {
        this.logger.warn(`Utilisateur résolveur avec l'ID ${resolvedBy} non trouvé`);
        throw new NotFoundException(`Utilisateur avec l'ID ${resolvedBy} non trouvé`);
      }

      return await this.update(id, { resolved: true, resolvedBy });
    } catch (error) {
      this.logger.error(`Erreur lors de la résolution de l'alerte ${id}: ${error.message}`, error.stack);
      throw error; // Re-throw car update() gère déjà les erreurs
    }
  }

  async remove(id: number): Promise<void> {
    try {
      this.logger.log(`Suppression de l'alerte ID: ${id}`);
      
      const alert = await this.alertsRepository.findOne({ where: { id } });
      
      if (!alert) {
        this.logger.warn(`Alerte avec l'ID ${id} non trouvée pour suppression`);
        throw new NotFoundException(`Alerte avec l'ID ${id} non trouvée`);
      }

      await this.alertsRepository.delete(id);
      this.logger.log(`Alerte ${id} supprimée avec succès`);
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de l'alerte ${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erreur lors de la suppression de l'alerte ${id}`);
    }
  }

  async getStatistics(): Promise<any> {
    try {
      this.logger.log('Calcul des statistiques des alertes');
      
      const [total, resolved, unresolved, typeStats] = await Promise.all([
        this.alertsRepository.count(),
        this.alertsRepository.count({ where: { resolved: true } }),
        this.alertsRepository.count({ where: { resolved: false } }),
        this.alertsRepository
          .createQueryBuilder('alert')
          .select('alert.type', 'type')
          .addSelect('COUNT(*)', 'count')
          .groupBy('alert.type')
          .getRawMany()
      ]);

      const statistics = {
        total,
        resolved,
        unresolved,
        byType: typeStats.reduce((acc, stat) => {
          acc[stat.type] = parseInt(stat.count);
          return acc;
        }, {}),
      };

      this.logger.debug(`Statistiques calculées: Total: ${total}, Résolues: ${resolved}, Non résolues: ${unresolved}`);
      return statistics;
    } catch (error) {
      this.logger.error(`Erreur lors du calcul des statistiques: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors du calcul des statistiques des alertes');
    }
  }

  private async formatAlertResponse(alert: Alert): Promise<AlertResponseDto> {
    try {
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
        try {
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
          } else {
            this.logger.warn(`Utilisateur résolveur ${alert.resolvedBy} non trouvé pour l'alerte ${alert.id}`);
          }
        } catch (resolverError) {
          this.logger.warn(`Erreur lors de la récupération du résolveur pour l'alerte ${alert.id}: ${resolverError.message}`);
          // Continue sans les informations du résolveur
        }
      }

      return response;
    } catch (error) {
      this.logger.error(`Erreur lors du formatage de la réponse de l'alerte ${alert.id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors du formatage de l'alerte ${alert.id}`);
    }
  }

  private getAlertTypeLabel(type: AlertType): string {
    try {
      const labels = {
        [AlertType.LATE]: 'Retard',
        [AlertType.ABSENCE]: 'Absence',
        [AlertType.BEHAVIOR]: 'Comportement',
        [AlertType.PERFORMANCE]: 'Performance',
        [AlertType.OTHER]: 'Autre',
      };
      return labels[type] || type;
    } catch (error) {
      this.logger.warn(`Erreur lors de la récupération du label pour le type ${type}: ${error.message}`);
      return type; // Fallback au type original
    }
  }

  // Méthodes utilitaires supplémentaires
  async createBulkAlerts(alerts: CreateAlertDto[]): Promise<AlertResponseDto[]> {
    try {
      this.logger.log(`Création en masse de ${alerts.length} alerte(s)`);
      
      const results: AlertResponseDto[] = [];
      const errors: string[] = [];

      for (const [index, alertDto] of alerts.entries()) {
        try {
          const result = await this.create(alertDto);
          results.push(result);
        } catch (error) {
          this.logger.warn(`Erreur lors de la création de l'alerte ${index + 1}: ${error.message}`);
          errors.push(`Alerte ${index + 1}: ${error.message}`);
        }
      }

      this.logger.log(`Création en masse terminée: ${results.length} succès, ${errors.length} erreurs`);
      
      if (errors.length > 0) {
        this.logger.warn(`Erreurs lors de la création en masse: ${errors.join('; ')}`);
      }

      return results;
    } catch (error) {
      this.logger.error(`Erreur lors de la création en masse d'alertes: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la création en masse d\'alertes');
    }
  }

  async getAlertsCountByStudent(studentId: number): Promise<{ total: number; resolved: number; unresolved: number }> {
    try {
      this.logger.log(`Comptage des alertes pour l'étudiant ID: ${studentId}`);
      
      const [total, resolved, unresolved] = await Promise.all([
        this.alertsRepository.count({ where: { studentId } }),
        this.alertsRepository.count({ where: { studentId, resolved: true } }),
        this.alertsRepository.count({ where: { studentId, resolved: false } })
      ]);

      const count = { total, resolved, unresolved };
      this.logger.debug(`Comptage pour l'étudiant ${studentId}: ${JSON.stringify(count)}`);
      
      return count;
    } catch (error) {
      this.logger.error(`Erreur lors du comptage des alertes pour l'étudiant ${studentId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors du comptage des alertes pour l'étudiant ${studentId}`);
    }
  }
}