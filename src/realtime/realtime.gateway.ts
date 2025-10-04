import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';
import { PresenceService } from './presence.service';
import { NotificationService } from './notification.service';
import { ChatService } from './chat.service';
import { LiveUpdatesService } from './live-updates.service';
import { MessageType } from './entities/chat-message.entity';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: number; 
    email: string;
    role: string;
    username: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Frontend URLs
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
    private readonly presenceService: PresenceService,
    private readonly notificationService: NotificationService,
    private readonly chatService: ChatService,
    private readonly liveUpdatesService: LiveUpdatesService,
  ) {}

  afterInit() {
    this.logger.log('🚀 WebSocket Gateway initialisé');
    this.realtimeService.setServer(this.server);
  }

  async handleConnection(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      this.logger.log(`Client tentative de connexion: ${client.id}`);

      // Authentification via token
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} rejeté: pas de token`);
        client.emit('error', { message: 'Token d\'authentification requis' });
        client.disconnect();
        return;
      }

      // Vérification du token
      const user = await this.validateToken(token);
      if (!user) {
        this.logger.warn(`Client ${client.id} rejeté: token invalide`);
        client.emit('error', { message: 'Token d\'authentification invalide' });
        client.disconnect();
        return;
      }

      // Assignation de l'utilisateur au socket
      client.user = user;
      
      // Ajout à la gestion des présences
      await this.presenceService.userConnected(client);
      
      // Jointure des rooms par rôle
      await this.joinUserRooms(client);

      // Envoi des notifications en attente
      await this.sendPendingNotifications(client);

      this.logger.log(`✅ Client connecté: ${user.email} (${client.id})`);
      
      client.emit('connected', {
        message: 'Connexion WebSocket établie',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Erreur connexion client ${client.id}: ${error.message}`, error.stack);
      client.emit('error', { message: 'Erreur de connexion' });
      client.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (client.user) {
        await this.presenceService.userDisconnected(client);
        this.logger.log(`👋 Client déconnecté: ${client.user.email} (${client.id})`);
      } else {
        this.logger.log(`Client déconnecté: ${client.id}`);
      }
    } catch (error) {
      this.logger.error(`Erreur déconnexion client ${client.id}: ${error.message}`, error.stack);
    }
  }

  // ==================== GESTION DES NOTIFICATIONS ====================

  @SubscribeMessage('subscribe_notifications')
  async handleSubscribeNotifications(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.user) return;

    await client.join(`notifications_${client.user.id}`);
    this.logger.log(`Client ${client.user.email} abonné aux notifications`);
    
    client.emit('subscribed', { 
      type: 'notifications',
      message: 'Abonné aux notifications temps réel' 
    });
  }

  @SubscribeMessage('mark_notification_read')
  async handleMarkNotificationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: number }
  ) {
    if (!client.user) return;

    try {
      await this.notificationService.markAsRead(data.notificationId, client.user.id);
      client.emit('notification_marked_read', { notificationId: data.notificationId });
    } catch (error) {
      client.emit('error', { message: 'Erreur lors du marquage de la notification' });
    }
  }

  // ==================== GESTION DU CHAT ====================

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string }
  ) {
    if (!client.user) return;

    await client.join(`chat_${data.chatId}`);
    this.logger.log(`${client.user.email} a rejoint le chat ${data.chatId}`);
    
    // Notification aux autres participants
    client.to(`chat_${data.chatId}`).emit('user_joined_chat', {
      user: {
        id: client.user.id,
        username: client.user.username,
        email: client.user.email,
      },
      chatId: data.chatId,
      timestamp: new Date().toISOString(),
    });

    client.emit('joined_chat', { chatId: data.chatId });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; message: string; type?: MessageType }
  ) {
    if (!client.user) return;

    try {
      const message = await this.chatService.sendMessage({
        chatId: data.chatId,
        senderId: client.user.id,
        content: data.message,
        type: data.type || MessageType.TEXT,
      });

      // Diffusion du message à tous les participants du chat
      this.server.to(`chat_${data.chatId}`).emit('new_message', {
        id: message.id,
        content: message.content,
        type: message.type,
        sender: {
          id: client.user.id,
          username: client.user.username,
          email: client.user.email,
        },
        chatId: data.chatId,
        timestamp: message.createdAt,
      });

    } catch (error) {
      client.emit('error', { message: 'Erreur lors de l\'envoi du message' });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; isTyping: boolean }
  ) {
    if (!client.user) return;

    client.to(`chat_${data.chatId}`).emit('user_typing', {
      user: {
        id: client.user.id,
        username: client.user.username,
      },
      chatId: data.chatId,
      isTyping: data.isTyping,
    });
  }

  // ==================== MISES À JOUR TEMPS RÉEL ====================

  @SubscribeMessage('subscribe_live_updates')
  async handleSubscribeLiveUpdates(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { entities: string[] } // ['students', 'absences', 'alerts', etc.]
  ) {
    if (!client.user) return;

    for (const entity of data.entities) {
      await client.join(`updates_${entity}`);
    }

    this.logger.log(`${client.user.email} abonné aux mises à jour: ${data.entities.join(', ')}`);
    
    client.emit('subscribed', { 
      type: 'live_updates',
      entities: data.entities,
      message: 'Abonné aux mises à jour temps réel' 
    });
  }

  // ==================== GESTION DES PRÉSENCES ====================

  @SubscribeMessage('get_online_users')
  async handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.user) return;

    const onlineUsers = await this.presenceService.getOnlineUsers();
    client.emit('online_users', onlineUsers);
  }

  @SubscribeMessage('update_status')
  async handleUpdateStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: 'available' | 'busy' | 'away' }
  ) {
    if (!client.user) return;

    await this.presenceService.updateUserStatus(client.user.id, data.status);
    
    // Notifier les autres utilisateurs
    this.server.emit('user_status_updated', {
      userId: client.user.id,
      username: client.user.username,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== MÉTHODES PRIVÉES ====================

  private extractTokenFromHandshake(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Token via query parameter
    const tokenQuery = client.handshake.query.token;
    if (typeof tokenQuery === 'string') {
      return tokenQuery;
    }

    return null;
  }

  private async validateToken(token: string): Promise<any> {
    try {
      const decoded = await this.jwtService.verifyAsync(token);
      return {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        username: decoded.username,
      };
    } catch (error) {
      return null;
    }
  }

  private async joinUserRooms(client: AuthenticatedSocket) {
    if (!client.user) return;

    // Room par rôle
    await client.join(`role_${client.user.role}`);
    
    // Room utilisateur spécifique
    await client.join(`user_${client.user.id}`);

    // Rooms spécifiques selon le rôle
    switch (client.user.role) {
      case 'ADMIN':
        await client.join('admins');
        await client.join('all_notifications');
        break;
      case 'INSTRUCTOR':
        await client.join('instructors');
        await client.join('course_updates');
        break;
      case 'STUDENT':
        await client.join('students');
        await client.join('student_updates');
        break;
    }
  }

  private async sendPendingNotifications(client: AuthenticatedSocket) {
    if (!client.user) return;

    try {
      const pendingNotifications = await this.notificationService.getPendingNotifications(client.user.id);
      
      if (pendingNotifications.length > 0) {
        client.emit('pending_notifications', {
          count: pendingNotifications.length,
          notifications: pendingNotifications,
        });
      }
    } catch (error) {
      this.logger.error(`Erreur récupération notifications en attente: ${error.message}`);
    }
  }

  // ==================== MÉTHODES PUBLIQUES POUR AUTRES SERVICES ====================

  public async sendNotificationToUser(userId: number, notification: any) {
    this.server.to(`user_${userId}`).emit('new_notification', notification);
  }

  public async sendNotificationToRole(role: string, notification: any) {
    this.server.to(`role_${role}`).emit('new_notification', notification);
  }

  public async broadcastLiveUpdate(entity: string, data: any) {
    this.server.to(`updates_${entity}`).emit('live_update', {
      entity,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  public async broadcastSystemAlert(alert: any) {
    this.server.emit('system_alert', alert);
  }
}