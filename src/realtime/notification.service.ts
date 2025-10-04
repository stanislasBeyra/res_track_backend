import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, IsNull } from 'typeorm';
import { Notification } from './entities/realtime-notification.entity';
import { User } from '../users/entities/user.entity';

export interface NotificationPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: any;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: Date;
  category?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    // Nettoyage périodique des notifications expirées
    setInterval(() => {
      this.cleanupExpiredNotifications();
    }, 60 * 60 * 1000); // Chaque heure
  }

  async createNotification(
    payload: NotificationPayload,
    targetUserIds: number[]
  ): Promise<Notification[]> {
    try {
      const notifications: Notification[] = [];

      for (const userId of targetUserIds) {
        const notification = this.notificationRepository.create({
          ...payload,
          userId,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
        });

        const saved = await this.notificationRepository.save(notification);
        notifications.push(saved);
      }

      this.logger.log(`📬 ${notifications.length} notifications créées: ${payload.title}`);
      return notifications;

    } catch (error) {
      this.logger.error(`Erreur création notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createBroadcastNotification(payload: NotificationPayload): Promise<Notification[]> {
    try {
      // Récupérer tous les utilisateurs actifs
      const users = await this.userRepository.find({
        where: { isActive: true },
        select: ['id'],
      });

      const userIds = users.map(user => user.id);
      return await this.createNotification(payload, userIds);

    } catch (error) {
      this.logger.error(`Erreur création notification broadcast: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createRoleNotification(payload: NotificationPayload, roles: string[]): Promise<Notification[]> {
    try {
      const users = await this.userRepository.find({
        where: {
          isActive: true,
          role: In(roles),
        },
        select: ['id'],
      });

      const userIds = users.map(user => user.id);
      return await this.createNotification(payload, userIds);

    } catch (error) {
      this.logger.error(`Erreur création notification par rôle: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPendingNotifications(userId: number): Promise<Notification[]> {
    try {
      return await this.notificationRepository.find({
        where: {
          userId,
          isRead: false,
          expiresAt: IsNull(), // Pas expirée ou pas d'expiration
        },
        order: { createdAt: 'DESC' },
        take: 50, // Limite à 50 notifications
      });

    } catch (error) {
      this.logger.error(`Erreur récupération notifications: ${error.message}`, error.stack);
      return [];
    }
  } 

  async getUserNotifications(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      includeRead?: boolean;
      category?: string;
      type?: string;
    } = {}
  ): Promise<{ notifications: Notification[], total: number }> {
    try {
      const { page = 1, limit = 20, includeRead = true, category, type } = options;

      const where: any = { userId };

      if (!includeRead) {
        where.isRead = false;
      }

      if (category) {
        where.category = category;
      }

      if (type) {
        where.type = type;
      }

      const [notifications, total] = await this.notificationRepository.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { notifications, total };

    } catch (error) {
      this.logger.error(`Erreur récupération notifications utilisateur: ${error.message}`, error.stack);
      return { notifications: [], total: 0 };
    }
  }

  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    try {
      const result = await this.notificationRepository.update(
        { id: notificationId, userId },
        { isRead: true, readAt: new Date() }
      );

      if (result.affected && result.affected > 0) {
        this.logger.debug(`✅ Notification ${notificationId} marquée comme lue par ${userId}`);
        return true;
      }

      return false;

    } catch (error) {
      this.logger.error(`Erreur marquage lecture notification: ${error.message}`, error.stack);
      return false;
    }
  }

  async markMultipleAsRead(notificationIds: number[], userId: number): Promise<number> {
    try {
      const result = await this.notificationRepository.update(
        { id: In(notificationIds), userId },
        { isRead: true, readAt: new Date() }
      );

      this.logger.log(`✅ ${result.affected} notifications marquées comme lues par ${userId}`);
      return result.affected || 0;

    } catch (error) {
      this.logger.error(`Erreur marquage multiple: ${error.message}`, error.stack);
      return 0;
    }
  }

  async markAllAsRead(userId: number): Promise<number> {
    try {
      const result = await this.notificationRepository.update(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      this.logger.log(`✅ Toutes les notifications marquées comme lues pour ${userId}`);
      return result.affected || 0;

    } catch (error) {
      this.logger.error(`Erreur marquage toutes comme lues: ${error.message}`, error.stack);
      return 0;
    }
  }

  async deleteNotification(notificationId: number, userId: number): Promise<boolean> {
    try {
      const result = await this.notificationRepository.delete({
        id: notificationId,
        userId,
      });

      if (result.affected && result.affected > 0) {
        this.logger.debug(`🗑️ Notification ${notificationId} supprimée par ${userId}`);
        return true;
      }

      return false;

    } catch (error) {
      this.logger.error(`Erreur suppression notification: ${error.message}`, error.stack);
      return false;
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    try {
      return await this.notificationRepository.count({
        where: {
          userId,
          isRead: false,
          expiresAt: IsNull(),
        },
      });

    } catch (error) {
      this.logger.error(`Erreur comptage non lues: ${error.message}`, error.stack);
      return 0;
    }
  }

  async getNotificationStats(userId?: number) {
    try {
      const baseWhere = userId ? { userId } : {};

      const [total, unread, byType, byPriority] = await Promise.all([
        this.notificationRepository.count({ where: baseWhere }),
        this.notificationRepository.count({ where: { ...baseWhere, isRead: false } }),
        this.getNotificationsByType(userId),
        this.getNotificationsByPriority(userId),
      ]);

      return {
        total,
        unread,
        read: total - unread,
        byType,
        byPriority,
        readRate: total > 0 ? Math.round(((total - unread) / total) * 100) : 0,
      };

    } catch (error) {
      this.logger.error(`Erreur statistiques notifications: ${error.message}`, error.stack);
      return null;
    }
  }

  private async getNotificationsByType(userId?: number) {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.type');

    if (userId) {
      query.where('notification.userId = :userId', { userId });
    }

    const result = await query.getRawMany();
    return result.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count);
      return acc;
    }, {});
  }

  private async getNotificationsByPriority(userId?: number) {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.priority');

    if (userId) {
      query.where('notification.userId = :userId', { userId });
    }

    const result = await query.getRawMany();
    return result.reduce((acc, item) => {
      acc[item.priority] = parseInt(item.count);
      return acc;
    }, {});
  }

  private async cleanupExpiredNotifications() {
    try {
      const now = new Date();
      
      const result = await this.notificationRepository.delete({
        expiresAt: LessThan(now),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`🧹 ${result.affected} notifications expirées supprimées`);
      }

    } catch (error) {
      this.logger.error(`Erreur nettoyage notifications: ${error.message}`, error.stack);
    }
  }

  // ==================== NOTIFICATIONS SPÉCIALISÉES ====================

  async notifyAbsenceCreated(absence: any) {
    const payload: NotificationPayload = {
      title: 'Nouvelle absence signalée',
      message: `Absence de l'étudiant ${absence.studentName || absence.studentId} le ${absence.date}`,
      type: 'warning',
      priority: 'medium',
      category: 'absence',
      data: absence,
      relatedEntityType: 'absence',
      relatedEntityId: absence.id,
      actionUrl: `/admin/absences/${absence.id}`,
    };

    return await this.createRoleNotification(payload, ['ADMIN', 'INSTRUCTOR']);
  }

  async notifyAlertCreated(alert: any) {
    const priority = alert.severity === 'HIGH' ? 'urgent' : 
                     alert.severity === 'MEDIUM' ? 'high' : 'medium';

    const payload: NotificationPayload = {
      title: 'Nouvelle alerte',
      message: alert.message,
      type: alert.severity === 'HIGH' ? 'error' : 'warning',
      priority,
      category: 'alert',
      data: alert,
      relatedEntityType: 'alert',
      relatedEntityId: alert.id,
      actionUrl: `/admin/alerts/${alert.id}`,
    };

    return await this.createRoleNotification(payload, ['ADMIN']);
  }

  async notifyGradeUpdated(grade: any, studentId: number) {
    const payload: NotificationPayload = {
      title: 'Note mise à jour',
      message: `Votre note pour ${grade.courseName} a été mise à jour: ${grade.value}`,
      type: 'info',
      priority: 'medium',
      category: 'grade',
      data: grade,
      relatedEntityType: 'grade',
      relatedEntityId: grade.id,
      actionUrl: `/student/grades`,
    };

    return await this.createNotification(payload, [studentId]);
  }

  async notifyScheduleChange(schedule: any, affectedUserIds: number[]) {
    const payload: NotificationPayload = {
      title: 'Modification d\'horaire',
      message: `L'horaire du cours "${schedule.courseName}" a été modifié`,
      type: 'warning',
      priority: 'high',
      category: 'schedule',
      data: schedule,
      relatedEntityType: 'schedule',
      relatedEntityId: schedule.id,
      actionUrl: `/schedule`,
    };

    return await this.createNotification(payload, affectedUserIds);
  }
}