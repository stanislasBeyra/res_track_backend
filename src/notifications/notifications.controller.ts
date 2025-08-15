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
  DefaultValuePipe,
  ParseEnumPipe
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
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationType } from './entities/notification.entity';
import { IsArray, IsString, IsEnum, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// DTO pour les réponses standardisées - RENOMMÉ pour éviter le conflit
export class NotificationApiResponse<T> {
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

// DTO pour la diffusion (broadcast)
export class BroadcastNotificationDto {
  @IsString()
  role: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.INFO;
}

// DTO pour les opérations en masse
export class BulkNotificationOperationDto {
  @IsArray()
  @IsNumber({}, { each: true })
  notificationIds: number[];
}

// DTO pour la suppression en masse avec filtre
export class BulkDeleteNotificationsDto {
  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsNumber()
  olderThanDays?: number; // Supprimer les notifications plus anciennes que X jours
}

// DTO pour les statistiques de notifications
export class NotificationStatisticsDto {
  total: number;
  read: number;
  unread: number;
  byType: Record<string, number>;
  byUser: { userId: number; count: number; username: string }[];
  readRate: number;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Créer une nouvelle notification',
    description: 'Crée une ou plusieurs notifications pour des utilisateurs' 
  })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Notification(s) créée(s) avec succès',
    type: [NotificationResponseDto] 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données invalides' 
  })
  async create(@Body(ValidationPipe) createNotificationDto: CreateNotificationDto): Promise<NotificationApiResponse<NotificationResponseDto[]>> {
    try {
      this.logger.log(`Requête de création de notification(s) - Titre: ${createNotificationDto.title}`);
      
      const notifications = await this.notificationsService.create(createNotificationDto);
      
      this.logger.log(`${notifications.length} notification(s) créée(s) avec succès`);
      return new NotificationApiResponse(true, `${notifications.length} notification(s) créée(s) avec succès`, notifications);
    } catch (error) {
      this.logger.error(`Erreur lors de la création de notification(s): ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors de la création de la notification', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @ApiOperation({ 
    summary: 'Récupérer toutes les notifications',
    description: 'Retourne la liste des notifications avec filtres et pagination' 
  })
  @ApiQuery({ name: 'userId', required: false, description: 'ID de l\'utilisateur' })
  @ApiQuery({ name: 'type', enum: NotificationType, required: false, description: 'Type de notification' })
  @ApiQuery({ name: 'read', required: false, description: 'Statut de lecture' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre d\'éléments par page' })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des notifications récupérée avec succès',
    type: [NotificationResponseDto] 
  })
  async findAll(
    @Query('userId', new DefaultValuePipe(null)) userId?: number,
    @Query('type') type?: NotificationType,
    @Query('read') read?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string = 'createdAt',
    @Query('sortOrder', new DefaultValuePipe('DESC')) sortOrder: 'ASC' | 'DESC' = 'DESC'
  ): Promise<NotificationApiResponse<NotificationResponseDto[]>> {
    try {
      this.logger.log(`Requête de récupération de notifications - Filtres: userId=${userId}, type=${type}, read=${read}`);
      
      // Validation des paramètres
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;
      if (!['ASC', 'DESC'].includes(sortOrder)) sortOrder = 'DESC';

      let notifications: NotificationResponseDto[] = [];

      if (userId) {
        if (read === 'false') {
          notifications = await this.notificationsService.findUnreadByUserId(Number(userId));
        } else {
          notifications = await this.notificationsService.findByUserId(Number(userId));
        }
      } else {
        notifications = await this.notificationsService.findAll();
      }

      // Filtrage par type si spécifié
      if (type) {
        if (!Object.values(NotificationType).includes(type)) {
          throw new BadRequestException(`Type de notification invalide: ${type}`);
        }
        notifications = notifications.filter(n => n.type === type);
      }

      // Filtrage par statut de lecture si spécifié
      if (read !== undefined && read !== null) {
        const isRead = read === 'true';
        notifications = notifications.filter(n => n.isRead === isRead);
      }

      // Tri
      notifications.sort((a, b) => {
        const aValue = a[sortBy as keyof NotificationResponseDto];
        const bValue = b[sortBy as keyof NotificationResponseDto];
        if (aValue === undefined && bValue === undefined) {
          return 0;
        } else if (aValue === undefined) {
          return sortOrder === 'ASC' ? 1 : -1;
        } else if (bValue === undefined) {
          return sortOrder === 'ASC' ? -1 : 1;
        }

        if (aValue === bValue) {
          return 0;
        }

        if (sortOrder === 'ASC') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Pagination
      const total = notifications.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedNotifications = notifications.slice(startIndex, endIndex);

      const response = new NotificationApiResponse(
        true, 
        `${paginatedNotifications.length} notification(s) récupérée(s)`, 
        paginatedNotifications
      );

      response.pagination = {
        page,
        limit,
        total,
        totalPages
      };

      this.logger.debug(`${paginatedNotifications.length} notification(s) récupérée(s) (page ${page}/${totalPages})`);
      return response;
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des notifications: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors de la récupération des notifications', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('statistics')
  async getStatistics(): Promise<NotificationApiResponse<NotificationStatisticsDto>> {
    try {
      this.logger.log('Requête de statistiques des notifications');
      
      // Ces méthodes devraient être ajoutées au service
      const allNotifications = await this.notificationsService.findAll();
      
      const total = allNotifications.length;
      const read = allNotifications.filter(n => n.isRead).length;
      const unread = total - read;
      
      // Statistiques par type
      const byType = allNotifications.reduce((acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Statistiques par utilisateur (top 10)
      const userStats = allNotifications.reduce((acc, notification) => {
        const existing = acc.find(u => u.userId === notification.userId);
        if (existing) {
          existing.count++;
        } else {
          acc.push({
            userId: notification.userId,
            count: 1,
            username: notification.user?.username || 'Utilisateur inconnu'
          });
        }
        return acc;
      }, [] as { userId: number; count: number; username: string }[]);

      // Trier et prendre les 10 premiers
      const topUsers = userStats
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const readRate = total > 0 ? Math.round((read / total) * 100) : 0;

      const statistics: NotificationStatisticsDto = {
        total,
        read,
        unread,
        byType,
        byUser: topUsers,
        readRate
      };

      this.logger.debug(`Statistiques calculées: Total: ${total}, Lues: ${read}, Non lues: ${unread}`);
      return new NotificationApiResponse(true, 'Statistiques récupérées avec succès', statistics);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des statistiques: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors de la récupération des statistiques', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('unread/:userId')
  async findUnread(@Param('userId', ParseIntPipe) userId: number): Promise<NotificationApiResponse<NotificationResponseDto[]>> {
    try {
      this.logger.log(`Requête de notifications non lues pour l'utilisateur: ${userId}`);
      
      const notifications = await this.notificationsService.findUnreadByUserId(userId);
      
      this.logger.debug(`${notifications.length} notification(s) non lue(s) pour l'utilisateur ${userId}`);
      return new NotificationApiResponse(true, 'Notifications non lues récupérées', notifications);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des notifications non lues: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors de la récupération des notifications non lues', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('count/:userId')
  async getUnreadCount(@Param('userId', ParseIntPipe) userId: number): Promise<NotificationApiResponse<{ count: number }>> {
    try {
      this.logger.log(`Requête de comptage des notifications non lues pour l'utilisateur: ${userId}`);
      
      const count = await this.notificationsService.getUnreadCount(userId);
      
      this.logger.debug(`${count} notification(s) non lue(s) pour l'utilisateur ${userId}`);
      return new NotificationApiResponse(true, 'Comptage récupéré avec succès', { count });
    } catch (error) {
      this.logger.error(`Erreur lors du comptage: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors du comptage des notifications', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('types')
  async getNotificationTypes(): Promise<NotificationApiResponse<{ types: NotificationType[]; labels: Record<string, string> }>> {
    try {
      this.logger.log('Requête de récupération des types de notifications');
      
      const types = Object.values(NotificationType);
      const labels = {
        [NotificationType.INFO]: 'Information',
        [NotificationType.WARNING]: 'Avertissement',
        [NotificationType.SUCCESS]: 'Succès',
        [NotificationType.ERROR]: 'Erreur',
      };

      return new NotificationApiResponse(true, 'Types de notifications récupérés', { types, labels });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des types: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors de la récupération des types', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<NotificationApiResponse<NotificationResponseDto>> {
    try {
      this.logger.log(`Requête de récupération de la notification: ${id}`);
      
      const notification = await this.notificationsService.findOne(id);
      
      this.logger.debug(`Notification ${id} récupérée avec succès`);
      return new NotificationApiResponse(true, 'Notification récupérée avec succès', notification);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de la notification ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors de la récupération de la notification', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateNotificationDto: UpdateNotificationDto
  ): Promise<NotificationApiResponse<NotificationResponseDto>> {
    try {
      this.logger.log(`Requête de mise à jour de la notification: ${id}`);
      
      const notification = await this.notificationsService.update(id, updateNotificationDto);
      
      this.logger.log(`Notification ${id} mise à jour avec succès`);
      return new NotificationApiResponse(true, 'Notification mise à jour avec succès', notification);
    } catch (error) {
      this.logger.error(`Erreur lors de la mise à jour de la notification ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors de la mise à jour de la notification', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number): Promise<NotificationApiResponse<NotificationResponseDto>> {
    try {
      this.logger.log(`Requête de marquage comme lue de la notification: ${id}`);
      
      const notification = await this.notificationsService.markAsRead(id);
      
      this.logger.log(`Notification ${id} marquée comme lue`);
      return new NotificationApiResponse(true, 'Notification marquée comme lue', notification);
    } catch (error) {
      this.logger.error(`Erreur lors du marquage comme lue: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors du marquage de la notification', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch('read-all/:userId')
  async markAllAsRead(@Param('userId', ParseIntPipe) userId: number): Promise<NotificationApiResponse<null>> {
    try {
      this.logger.log(`Requête de marquage de toutes les notifications comme lues pour l'utilisateur: ${userId}`);
      
      await this.notificationsService.markAllAsReadForUser(userId);
      
      this.logger.log(`Toutes les notifications marquées comme lues pour l'utilisateur ${userId}`);
      return new NotificationApiResponse(true, 'Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      this.logger.error(`Erreur lors du marquage de toutes les notifications: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors du marquage des notifications', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch('bulk/read')
  async markBulkAsRead(@Body(ValidationPipe) bulkDto: BulkNotificationOperationDto): Promise<NotificationApiResponse<{ marked: number; errors: string[] }>> {
    try {
      this.logger.log(`Requête de marquage en masse de ${bulkDto.notificationIds.length} notification(s)`);
      
      if (bulkDto.notificationIds.length === 0) {
        throw new BadRequestException('La liste des IDs de notifications ne peut pas être vide');
      }

      if (bulkDto.notificationIds.length > 50) {
        throw new BadRequestException('Impossible de marquer plus de 50 notifications à la fois');
      }

      let marked = 0;
      const errors: string[] = [];

      for (const notificationId of bulkDto.notificationIds) {
        try {
          await this.notificationsService.markAsRead(notificationId);
          marked++;
        } catch (error) {
          errors.push(`Notification ${notificationId}: ${error.message}`);
        }
      }

      this.logger.log(`Marquage en masse terminé: ${marked} succès, ${errors.length} erreurs`);
      return new NotificationApiResponse(
        true, 
        `${marked} notification(s) marquée(s) comme lue(s)`, 
        { marked, errors }
      );
    } catch (error) {
      this.logger.error(`Erreur lors du marquage en masse: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors du marquage en masse', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('broadcast')
  async broadcast(@Body(ValidationPipe) broadcastDto: BroadcastNotificationDto): Promise<NotificationApiResponse<NotificationResponseDto[]>> {
    try {
      this.logger.log(`Requête de diffusion pour le rôle: ${broadcastDto.role} - Titre: ${broadcastDto.title}`);
      
      const notifications = await this.notificationsService.broadcastToRole(
        broadcastDto.role, 
        broadcastDto.title, 
        broadcastDto.message, 
        broadcastDto.type
      );
      
      this.logger.log(`Diffusion réussie: ${notifications.length} notification(s) envoyée(s)`);
      return new NotificationApiResponse(true, `${notifications.length} notification(s) diffusée(s) avec succès`, notifications);
    } catch (error) {
      this.logger.error(`Erreur lors de la diffusion: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors de la diffusion', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<NotificationApiResponse<null>> {
    try {
      this.logger.log(`Requête de suppression de la notification: ${id}`);
      
      await this.notificationsService.remove(id);
      
      this.logger.log(`Notification ${id} supprimée avec succès`);
      return new NotificationApiResponse(true, 'Notification supprimée avec succès');
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors de la suppression de la notification', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('bulk')
  async removeBulk(@Body(ValidationPipe) bulkDto: BulkNotificationOperationDto): Promise<NotificationApiResponse<{ deleted: number; errors: string[] }>> {
    try {
      this.logger.log(`Requête de suppression en masse de ${bulkDto.notificationIds.length} notification(s)`);
      
      if (bulkDto.notificationIds.length === 0) {
        throw new BadRequestException('La liste des IDs de notifications ne peut pas être vide');
      }

      if (bulkDto.notificationIds.length > 50) {
        throw new BadRequestException('Impossible de supprimer plus de 50 notifications à la fois');
      }

      let deleted = 0;
      const errors: string[] = [];

      for (const notificationId of bulkDto.notificationIds) {
        try {
          await this.notificationsService.remove(notificationId);
          deleted++;
        } catch (error) {
          errors.push(`Notification ${notificationId}: ${error.message}`);
        }
      }

      this.logger.log(`Suppression en masse terminée: ${deleted} supprimées, ${errors.length} erreurs`);
      return new NotificationApiResponse(
        true, 
        `${deleted} notification(s) supprimée(s) avec succès`, 
        { deleted, errors }
      );
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression en masse: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors de la suppression en masse', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('cleanup')
  async cleanup(@Body(ValidationPipe) cleanupDto: BulkDeleteNotificationsDto): Promise<NotificationApiResponse<{ deleted: number }>> {
    try {
      this.logger.log(`Requête de nettoyage des notifications avec filtres: ${JSON.stringify(cleanupDto)}`);
      
      // Cette méthode devrait être ajoutée au service
      // Pour l'instant, on peut implémenter une logique simple
      
      let notifications: NotificationResponseDto[] = [];
      
      if (cleanupDto.userId) {
        notifications = await this.notificationsService.findByUserId(cleanupDto.userId);
      } else {
        notifications = await this.notificationsService.findAll();
      }

      // Filtrer par type si spécifié
      if (cleanupDto.type) {
        notifications = notifications.filter(n => n.type === cleanupDto.type);
      }

      // Filtrer par âge si spécifié
      if (cleanupDto.olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - cleanupDto.olderThanDays);
        
        notifications = notifications.filter(n => new Date(n.createdAt) < cutoffDate);
      }

      let deleted = 0;
      for (const notification of notifications) {
        try {
          await this.notificationsService.remove(notification.id);
          deleted++;
        } catch (error) {
          this.logger.warn(`Erreur lors de la suppression de la notification ${notification.id}: ${error.message}`);
        }
      }

      this.logger.log(`Nettoyage terminé: ${deleted} notification(s) supprimée(s)`);
      return new NotificationApiResponse(true, `${deleted} notification(s) supprimée(s) lors du nettoyage`, { deleted });
    } catch (error) {
      this.logger.error(`Erreur lors du nettoyage: ${error.message}`, error.stack);
      throw new HttpException(
        new NotificationApiResponse(false, 'Erreur lors du nettoyage des notifications', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}