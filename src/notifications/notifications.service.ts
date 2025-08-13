import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<NotificationResponseDto[]> {
    try {
      this.logger.log(`Création de notification(s) - Données: ${JSON.stringify(createNotificationDto)}`);
      
      const { userId, userIds, ...notificationData } = createNotificationDto;
      
      // Déterminer les IDs des utilisateurs cibles
      let targetUserIds: number[] = [];
      
      if (userId) {
        targetUserIds = [userId];
      } else if (userIds && userIds.length > 0) {
        targetUserIds = userIds;
      } else {
        throw new BadRequestException('userId ou userIds doit être fourni');
      }

      this.logger.debug(`IDs utilisateurs cibles: ${targetUserIds.join(', ')}`);

      // Vérifier que tous les utilisateurs existent
      const users = await this.usersRepository.find({
        where: { id: In(targetUserIds) },
      });

      if (users.length !== targetUserIds.length) {
        const foundIds = users.map(user => user.id);
        const missingIds = targetUserIds.filter(id => !foundIds.includes(id));
        this.logger.warn(`Utilisateurs non trouvés avec les IDs: ${missingIds.join(', ')}`);
        throw new BadRequestException(`Utilisateurs non trouvés avec les IDs: ${missingIds.join(', ')}`);
      }

      // Créer les notifications
      const notifications = targetUserIds.map(id => 
        this.notificationsRepository.create({
          ...notificationData,
          userId: id,
        })
      );

      const savedNotifications = await this.notificationsRepository.save(notifications);
      this.logger.log(`${savedNotifications.length} notification(s) créée(s) avec succès`);
      
      return savedNotifications.map(notification => this.formatNotificationResponse(notification));
    } catch (error) {
      this.logger.error(`Erreur lors de la création de notification(s): ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erreur lors de la création de la notification');
    }
  }

  async findAll(): Promise<NotificationResponseDto[]> {
    try {
      this.logger.log('Récupération de toutes les notifications');
      
      const notifications = await this.notificationsRepository.find({
        relations: ['user', 'user.profile'],
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(`${notifications.length} notification(s) trouvée(s)`);
      return notifications.map(notification => this.formatNotificationResponse(notification));
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des notifications: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des notifications');
    }
  }

  async findByUserId(userId: number): Promise<NotificationResponseDto[]> {
    try {
      this.logger.log(`Récupération des notifications pour l'utilisateur ID: ${userId}`);
      
      const notifications = await this.notificationsRepository.find({
        where: { userId },
        relations: ['user', 'user.profile'],
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(`${notifications.length} notification(s) trouvée(s) pour l'utilisateur ${userId}`);
      return notifications.map(notification => this.formatNotificationResponse(notification));
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des notifications pour l'utilisateur ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors de la récupération des notifications pour l'utilisateur ${userId}`);
    }
  }

  async findUnreadByUserId(userId: number): Promise<NotificationResponseDto[]> {
    try {
      this.logger.log(`Récupération des notifications non lues pour l'utilisateur ID: ${userId}`);
      
      const notifications = await this.notificationsRepository.find({
        where: { userId, isRead: false },
        relations: ['user', 'user.profile'],
        order: { createdAt: 'DESC' },
      });

      this.logger.debug(`${notifications.length} notification(s) non lue(s) trouvée(s) pour l'utilisateur ${userId}`);
      return notifications.map(notification => this.formatNotificationResponse(notification));
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des notifications non lues pour l'utilisateur ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors de la récupération des notifications non lues pour l'utilisateur ${userId}`);
    }
  }

  async findOne(id: number): Promise<NotificationResponseDto> {
    try {
      this.logger.log(`Récupération de la notification ID: ${id}`);
      
      const notification = await this.notificationsRepository.findOne({
        where: { id },
        relations: ['user', 'user.profile'],
      });

      if (!notification) {
        this.logger.warn(`Notification avec l'ID ${id} non trouvée`);
        throw new NotFoundException(`Notification avec l'ID ${id} non trouvée`);
      }

      this.logger.debug(`Notification ${id} récupérée avec succès`);
      return this.formatNotificationResponse(notification);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de la notification ${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erreur lors de la récupération de la notification ${id}`);
    }
  }

  async update(id: number, updateNotificationDto: UpdateNotificationDto): Promise<NotificationResponseDto> {
    try {
      this.logger.log(`Mise à jour de la notification ID: ${id} - Données: ${JSON.stringify(updateNotificationDto)}`);
      
      const notification = await this.notificationsRepository.findOne({ where: { id } });
      
      if (!notification) {
        this.logger.warn(`Notification avec l'ID ${id} non trouvée pour mise à jour`);
        throw new NotFoundException(`Notification avec l'ID ${id} non trouvée`);
      }

      // Si on marque comme lu, définir readAt
      if (updateNotificationDto.isRead === true && !notification.isRead) {
        updateNotificationDto['readAt'] = new Date();
        this.logger.debug(`Notification ${id} marquée comme lue`);
      }

      await this.notificationsRepository.update(id, updateNotificationDto);
      this.logger.log(`Notification ${id} mise à jour avec succès`);
      
      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour de la notification ${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erreur lors de la mise à jour de la notification ${id}`);
    }
  }

  async markAsRead(id: number): Promise<NotificationResponseDto> {
    try {
      this.logger.log(`Marquage comme lue de la notification ID: ${id}`);
      return await this.update(id, { isRead: true });
    } catch (error) {
      this.logger.error(`Erreur lors du marquage comme lue de la notification ${id}: ${error.message}`, error.stack);
      throw error; // Re-throw car update() gère déjà les erreurs
    }
  }

  async markAllAsReadForUser(userId: number): Promise<void> {
    try {
      this.logger.log(`Marquage de toutes les notifications comme lues pour l'utilisateur ID: ${userId}`);
      
      const result = await this.notificationsRepository.update(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      this.logger.log(`${result.affected || 0} notification(s) marquée(s) comme lue(s) pour l'utilisateur ${userId}`);
    } catch (error) {
      this.logger.error(`Erreur lors du marquage de toutes les notifications comme lues pour l'utilisateur ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors du marquage des notifications comme lues pour l'utilisateur ${userId}`);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      this.logger.log(`Suppression de la notification ID: ${id}`);
      
      const notification = await this.notificationsRepository.findOne({ where: { id } });
      
      if (!notification) {
        this.logger.warn(`Notification avec l'ID ${id} non trouvée pour suppression`);
        throw new NotFoundException(`Notification avec l'ID ${id} non trouvée`);
      }

      await this.notificationsRepository.delete(id);
      this.logger.log(`Notification ${id} supprimée avec succès`);
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression de la notification ${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erreur lors de la suppression de la notification ${id}`);
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    try {
      this.logger.log(`Comptage des notifications non lues pour l'utilisateur ID: ${userId}`);
      
      const count = await this.notificationsRepository.count({
        where: { userId, isRead: false },
      });

      this.logger.debug(`${count} notification(s) non lue(s) pour l'utilisateur ${userId}`);
      return count;
    } catch (error) {
      this.logger.error(`Erreur lors du comptage des notifications non lues pour l'utilisateur ${userId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors du comptage des notifications non lues pour l'utilisateur ${userId}`);
    }
  }

  // Méthodes utilitaires pour créer des notifications spécifiques
  async createWelcomeNotification(userId: number): Promise<NotificationResponseDto[]> {
    try {
      this.logger.log(`Création de notification de bienvenue pour l'utilisateur ID: ${userId}`);
      
      return await this.create({
        userId,
        title: '🎉 Bienvenue !',
        message: 'Bienvenue dans notre système de gestion scolaire. N\'hésitez pas à explorer toutes les fonctionnalités disponibles.',
        type: NotificationType.SUCCESS,
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la création de la notification de bienvenue pour l'utilisateur ${userId}: ${error.message}`, error.stack);
      throw error; // Re-throw car create() gère déjà les erreurs
    }
  }

  async createAlertNotification(studentId: number, alertMessage: string): Promise<NotificationResponseDto[]> {
    try {
      this.logger.log(`Création de notification d'alerte pour l'étudiant ID: ${studentId}`);
      
      // Trouver l'utilisateur associé à l'étudiant
      const user = await this.usersRepository.findOne({
        where: { student: { id: studentId } },
        relations: ['student'],
      });

      if (!user) {
        this.logger.warn(`Utilisateur associé à l'étudiant ${studentId} non trouvé`);
        throw new NotFoundException(`Utilisateur associé à l'étudiant ${studentId} non trouvé`);
      }

      this.logger.debug(`Utilisateur ${user.id} trouvé pour l'étudiant ${studentId}`);
      
      return await this.create({
        userId: user.id,
        title: '⚠️ Nouvelle alerte',
        message: alertMessage,
        type: NotificationType.WARNING,
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la création de la notification d'alerte pour l'étudiant ${studentId}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erreur lors de la création de la notification d'alerte pour l'étudiant ${studentId}`);
    }
  }

  async broadcastToRole(role: string, title: string, message: string, type: NotificationType = NotificationType.INFO): Promise<NotificationResponseDto[]> {
    try {
      this.logger.log(`Diffusion de notification au rôle: ${role} - Titre: ${title}`);
      
      const users = await this.usersRepository.find({
        where: { role: role as any },
      });

      if (users.length === 0) {
        this.logger.warn(`Aucun utilisateur trouvé avec le rôle: ${role}`);
        return [];
      }

      const userIds = users.map(user => user.id);
      this.logger.debug(`${userIds.length} utilisateur(s) trouvé(s) avec le rôle ${role}`);
      
      return await this.create({
        userIds,
        title,
        message,
        type,
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la diffusion au rôle ${role}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors de la diffusion de notification au rôle ${role}`);
    }
  }

  private formatNotificationResponse(notification: Notification): NotificationResponseDto {
    try {
      const response: NotificationResponseDto = {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
      };

      if (notification.user) {
        response.user = {
          id: notification.user.id,
          username: notification.user.username,
          email: notification.user.email,
          profile: {
            firstName: notification.user.profile?.firstName || '',
            lastName: notification.user.profile?.lastName || '',
          },
        };
      }

      return response;
    } catch (error) {
      this.logger.error(`Erreur lors du formatage de la réponse de notification ${notification.id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors du formatage de la notification ${notification.id}`);
    }
  }
}