import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Patch,
  UseGuards,
  Req,
  Logger,
  ParseIntPipe,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { RealtimeService } from './realtime.service';
import { PresenceService } from './presence.service';
import { NotificationService, NotificationPayload } from './notification.service';
import { Notification } from './entities/realtime-notification.entity';
import { ChatService, CreateChatDto, SendMessageDto } from './chat.service';
import { LiveUpdatesService } from './live-updates.service';
import { JwtAuthGuard } from '../auth/guards/wt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

export class RealtimeApiResponse<T> {
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

@ApiTags('Real-time')
@ApiBearerAuth()
@Controller('realtime')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RealtimeController {
  private readonly logger = new Logger(RealtimeController.name);

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly presenceService: PresenceService,
    private readonly notificationService: NotificationService,
    private readonly chatService: ChatService,
    private readonly liveUpdatesService: LiveUpdatesService,
  ) {}

  // ==================== PRÉSENCE ====================

  @Get('presence/online')
  @ApiOperation({
    summary: 'Utilisateurs en ligne',
    description: 'Récupère la liste des utilisateurs actuellement en ligne',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs en ligne récupérée avec succès',
  })
  async getOnlineUsers(@Req() req: any): Promise<RealtimeApiResponse<any[]>> {
    try {
      const onlineUsers = await this.presenceService.getOnlineUsers();
      
      return new RealtimeApiResponse(
        true,
        `${onlineUsers.length} utilisateurs en ligne`,
        onlineUsers,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération utilisateurs en ligne: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors de la récupération des utilisateurs en ligne', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('presence/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Statistiques de présence',
    description: 'Récupère les statistiques détaillées de présence',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques de présence récupérées avec succès',
  })
  async getPresenceStats(): Promise<RealtimeApiResponse<any>> {
    try {
      const stats = await this.presenceService.getPresenceStats();
      
      return new RealtimeApiResponse(
        true,
        'Statistiques de présence récupérées avec succès',
        stats,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération stats présence: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors de la récupération des statistiques', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== NOTIFICATIONS ====================

  @Get('notifications')
  @ApiOperation({
    summary: 'Notifications utilisateur',
    description: 'Récupère les notifications de l\'utilisateur connecté',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre par page (défaut: 20)' })
  @ApiQuery({ name: 'includeRead', required: false, description: 'Inclure les lues (défaut: true)' })
  @ApiResponse({
    status: 200,
    description: 'Notifications récupérées avec succès',
  })
  async getUserNotifications(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('includeRead') includeRead: boolean = true,
  ): Promise<RealtimeApiResponse<any>> {
    try {
      const userId = req.user.id;
      const result = await this.notificationService.getUserNotifications(userId, {
        page,
        limit,
        includeRead,
      });
      
      return new RealtimeApiResponse(
        true,
        `${result.notifications.length} notifications récupérées`,
        {
          notifications: result.notifications,
          total: result.total,
          page,
          limit,
          pages: Math.ceil(result.total / limit),
        },
      );
    } catch (error) {
      this.logger.error(`Erreur récupération notifications: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors de la récupération des notifications', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('notifications/unread-count')
  @ApiOperation({
    summary: 'Nombre de notifications non lues',
    description: 'Récupère le nombre de notifications non lues',
  })
  @ApiResponse({
    status: 200,
    description: 'Nombre de notifications non lues',
  })
  async getUnreadCount(@Req() req: any): Promise<RealtimeApiResponse<number>> {
    try {
      const userId = req.user.id;
      const count = await this.notificationService.getUnreadCount(userId);
      
      return new RealtimeApiResponse(
        true,
        `${count} notifications non lues`,
        count,
      );
    } catch (error) {
      this.logger.error(`Erreur comptage notifications: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors du comptage', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('notifications/:id/read')
  @ApiOperation({
    summary: 'Marquer notification comme lue',
    description: 'Marque une notification spécifique comme lue',
  })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification marquée comme lue',
  })
  async markNotificationAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<RealtimeApiResponse<boolean>> {
    try {
      const userId = req.user.id;
      const success = await this.notificationService.markAsRead(id, userId);
      
      return new RealtimeApiResponse(
        success,
        success ? 'Notification marquée comme lue' : 'Notification non trouvée',
        success,
      );
    } catch (error) {
      this.logger.error(`Erreur marquage notification: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors du marquage', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('notifications/read-all')
  @ApiOperation({
    summary: 'Marquer toutes comme lues',
    description: 'Marque toutes les notifications comme lues',
  })
  @ApiResponse({
    status: 200,
    description: 'Toutes les notifications marquées comme lues',
  })
  async markAllAsRead(@Req() req: any): Promise<RealtimeApiResponse<number>> {
    try {
      const userId = req.user.id;
      const count = await this.notificationService.markAllAsRead(userId);
      
      return new RealtimeApiResponse(
        true,
        `${count} notifications marquées comme lues`,
        count,
      );
    } catch (error) {
      this.logger.error(`Erreur marquage toutes notifications: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors du marquage', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('notifications/send')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Envoyer une notification',
    description: 'Envoie une notification à des utilisateurs spécifiques',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        message: { type: 'string' },
        type: { type: 'string', enum: ['info', 'success', 'warning', 'error'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        userIds: { type: 'array', items: { type: 'number' } },
        roles: { type: 'array', items: { type: 'string' } },
        broadcast: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Notification envoyée avec succès',
  })
  async sendNotification(
    @Body() body: {
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error';
      priority: 'low' | 'medium' | 'high' | 'urgent';
      userIds?: number[];
      roles?: string[];
      broadcast?: boolean;
      data?: any;
    },
  ): Promise<RealtimeApiResponse<any>> {
    try {
      const payload: NotificationPayload = {
        title: body.title,
        message: body.message,
        type: body.type,
        priority: body.priority,
        data: body.data,
      };

      let notifications: Notification[] = [];

      if (body.broadcast) {
        notifications = await this.notificationService.createBroadcastNotification(payload);
        await this.realtimeService.broadcastNotification({
          title: payload.title,
          message: payload.message,
          type: payload.type,
          data: payload.data,
        });
      } else if (body.roles && body.roles.length > 0) {
        notifications = await this.notificationService.createRoleNotification(payload, body.roles);
        for (const role of body.roles) {
          await this.realtimeService.sendNotificationToRole(role, {
            title: payload.title,
            message: payload.message,
            type: payload.type,
            data: payload.data,
          });
        }
      } else if (body.userIds && body.userIds.length > 0) {
        notifications = await this.notificationService.createNotification(payload, body.userIds);
        for (const userId of body.userIds) {
          await this.realtimeService.sendNotificationToUser(userId, {
            title: payload.title,
            message: payload.message,
            type: payload.type,
            data: payload.data,
          });
        }
      }

      return new RealtimeApiResponse(
        true,
        `${notifications.length} notifications envoyées`,
        { count: notifications.length },
      );
    } catch (error) {
      this.logger.error(`Erreur envoi notification: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors de l\'envoi de la notification', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== CHAT ====================

  @Get('chats')
  @ApiOperation({
    summary: 'Chats de l\'utilisateur',
    description: 'Récupère tous les chats de l\'utilisateur connecté',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Type de chat' })
  @ApiQuery({ name: 'page', required: false, description: 'Page (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre par page (défaut: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Chats récupérés avec succès',
  })
  async getUserChats(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<RealtimeApiResponse<any>> {
    try {
      const userId = req.user.id;
      const result = await this.chatService.getUserChats(userId, { type, page, limit });
      
      return new RealtimeApiResponse(
        true,
        `${result.chats.length} chats récupérés`,
        {
          chats: result.chats,
          total: result.total,
          page,
          limit,
          pages: Math.ceil(result.total / limit),
        },
      );
    } catch (error) {
      this.logger.error(`Erreur récupération chats: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors de la récupération des chats', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('chats')
  @ApiOperation({
    summary: 'Créer un chat',
    description: 'Crée un nouveau chat ou conversation',
  })
  @ApiResponse({
    status: 201,
    description: 'Chat créé avec succès',
  })
  async createChat(
    @Body() createChatDto: CreateChatDto,
    @Req() req: any,
  ): Promise<RealtimeApiResponse<any>> {
    try {
      const creatorId = req.user.id;
      const chat = await this.chatService.createChat(createChatDto, creatorId);
      
      return new RealtimeApiResponse(
        true,
        'Chat créé avec succès',
        chat,
      );
    } catch (error) {
      this.logger.error(`Erreur création chat: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors de la création du chat', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('chats/:chatId/messages')
  @ApiOperation({
    summary: 'Messages du chat',
    description: 'Récupère les messages d\'un chat spécifique',
  })
  @ApiParam({ name: 'chatId', description: 'ID du chat' })
  @ApiQuery({ name: 'page', required: false, description: 'Page (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre par page (défaut: 50)' })
  @ApiResponse({
    status: 200,
    description: 'Messages récupérés avec succès',
  })
  async getChatMessages(
    @Param('chatId') chatId: string,
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ): Promise<RealtimeApiResponse<any>> {
    try {
      const userId = req.user.id;
      const result = await this.chatService.getChatMessages(chatId, userId, { page, limit });
      
      return new RealtimeApiResponse(
        true,
        `${result.messages.length} messages récupérés`,
        {
          messages: result.messages,
          hasMore: result.hasMore,
        },
      );
    } catch (error) {
      this.logger.error(`Erreur récupération messages: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors de la récupération des messages', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== STATISTIQUES TEMPS RÉEL ====================

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Statistiques temps réel',
    description: 'Récupère les statistiques du système temps réel',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
  })
  async getRealtimeStats(): Promise<RealtimeApiResponse<any>> {
    try {
      const [realtimeStats, presenceStats, notificationStats, queueStats] = await Promise.all([
        this.realtimeService.getRealtimeStats(),
        this.presenceService.getPresenceStats(),
        this.notificationService.getNotificationStats(),
        this.liveUpdatesService.getQueueStats(),
      ]);

      const stats = {
        realtime: realtimeStats,
        presence: presenceStats,
        notifications: notificationStats,
        updateQueue: queueStats,
      };
      
      return new RealtimeApiResponse(
        true,
        'Statistiques temps réel récupérées',
        stats,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération stats: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors de la récupération des statistiques', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('maintenance/notice')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Notice de maintenance',
    description: 'Envoie une notice de maintenance à tous les utilisateurs',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        delayMinutes: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notice de maintenance envoyée',
  })
  async sendMaintenanceNotice(
    @Body() body: { message: string; delayMinutes?: number },
  ): Promise<RealtimeApiResponse<null>> {
    try {
      await this.realtimeService.sendMaintenanceNotice(body.message, body.delayMinutes);
      
      return new RealtimeApiResponse(
        true,
        'Notice de maintenance envoyée',
        null,
      );
    } catch (error) {
      this.logger.error(`Erreur envoi notice maintenance: ${error.message}`, error.stack);
      throw new HttpException(
        new RealtimeApiResponse(false, 'Erreur lors de l\'envoi de la notice', null, error.message),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}