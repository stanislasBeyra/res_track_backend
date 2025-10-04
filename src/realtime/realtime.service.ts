import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server: Server;
  private readonly logger = new Logger(RealtimeService.name);

  setServer(server: Server) {
    this.server = server;
    this.logger.log('🔗 Serveur WebSocket configuré');
  }

  // ==================== NOTIFICATIONS GÉNÉRIQUES ====================

  async sendNotificationToUser(userId: number, notification: {
    id?: number;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    data?: any;
    actionUrl?: string;
  }) { 
    if (!this.server) {
      this.logger.warn('Serveur WebSocket non initialisé');
      return;
    }

    const payload = {
      ...notification,
      timestamp: new Date().toISOString(),
      userId,
    };

    this.server.to(`user_${userId}`).emit('new_notification', payload);
    this.server.to(`notifications_${userId}`).emit('notification', payload);

    this.logger.log(`📩 Notification envoyée à l'utilisateur ${userId}: ${notification.title}`);
  }

  async sendNotificationToRole(role: string, notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    data?: any;
  }) {
    if (!this.server) return;

    const payload = {
      ...notification,
      timestamp: new Date().toISOString(),
      targetRole: role,
    };

    this.server.to(`role_${role}`).emit('new_notification', payload);
    this.logger.log(`📩 Notification envoyée au rôle ${role}: ${notification.title}`);
  }

  async broadcastNotification(notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    data?: any;
  }) {
    if (!this.server) return;

    const payload = {
      ...notification,
      timestamp: new Date().toISOString(),
      broadcast: true,
    };

    this.server.emit('new_notification', payload);
    this.logger.log(`📢 Notification diffusée: ${notification.title}`);
  }

  // ==================== MISES À JOUR D'ENTITÉS ====================

  async notifyEntityCreated(entity: string, data: any, targetUsers?: number[]) {
    if (!this.server) return;

    const payload = {
      action: 'created',
      entity,
      data,
      timestamp: new Date().toISOString(),
    };

    if (targetUsers && targetUsers.length > 0) {
      targetUsers.forEach(userId => {
        this.server.to(`user_${userId}`).emit('entity_update', payload);
      });
    } else {
      this.server.to(`updates_${entity}`).emit('entity_update', payload);
    }

    this.logger.log(`➕ Entité créée notifiée: ${entity}`);
  }

  async notifyEntityUpdated(entity: string, id: number, data: any, targetUsers?: number[]) {
    if (!this.server) return;

    const payload = {
      action: 'updated',
      entity,
      id,
      data,
      timestamp: new Date().toISOString(),
    };

    if (targetUsers && targetUsers.length > 0) {
      targetUsers.forEach(userId => {
        this.server.to(`user_${userId}`).emit('entity_update', payload);
      });
    } else {
      this.server.to(`updates_${entity}`).emit('entity_update', payload);
    }

    this.logger.log(`✏️ Entité mise à jour notifiée: ${entity}#${id}`);
  }

  async notifyEntityDeleted(entity: string, id: number, targetUsers?: number[]) {
    if (!this.server) return;

    const payload = {
      action: 'deleted',
      entity,
      id,
      timestamp: new Date().toISOString(),
    };

    if (targetUsers && targetUsers.length > 0) {
      targetUsers.forEach(userId => {
        this.server.to(`user_${userId}`).emit('entity_update', payload);
      });
    } else {
      this.server.to(`updates_${entity}`).emit('entity_update', payload);
    }

    this.logger.log(`❌ Entité supprimée notifiée: ${entity}#${id}`);
  }

  // ==================== ALERTES SYSTÈME ====================

  async sendSystemAlert(alert: {
    level: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    targetRoles?: string[];
    data?: any;
  }) {
    if (!this.server) return;

    const payload = {
      ...alert,
      timestamp: new Date().toISOString(),
      type: 'system_alert',
    };

    if (alert.targetRoles && alert.targetRoles.length > 0) {
      alert.targetRoles.forEach(role => {
        this.server.to(`role_${role}`).emit('system_alert', payload);
      });
    } else {
      this.server.emit('system_alert', payload);
    }

    this.logger.log(`🚨 Alerte système envoyée (${alert.level}): ${alert.title}`);
  }

  // ==================== ÉVÉNEMENTS SPÉCIFIQUES ====================

  // Absences
  async notifyNewAbsence(absence: any) {
    await this.notifyEntityCreated('absences', absence);
    
    // Notification spécifique pour l'absence
    await this.sendNotificationToRole('ADMIN', {
      title: 'Nouvelle absence signalée',
      message: `Absence de l'étudiant ${absence.studentName || absence.studentId} le ${absence.date}`,
      type: 'warning',
      data: absence,
    });
  }

  async notifyAbsenceJustified(absence: any) {
    await this.notifyEntityUpdated('absences', absence.id, absence);
    
    await this.sendNotificationToUser(absence.verifiedBy, {
      title: 'Absence justifiée',
      message: `L'absence de l'étudiant ${absence.studentName} a été justifiée`,
      type: 'success',
      data: absence,
    });
  }

  // Alertes
  async notifyNewAlert(alert: any) {
    await this.notifyEntityCreated('alerts', alert);

    const notification = {
      title: 'Nouvelle alerte',
      message: alert.message,
      type: alert.severity === 'HIGH' ? 'error' as const : 'warning' as const,
      data: alert,
    };

    // Notifier selon le type d'alerte
    if (alert.type === 'ABSENCE') {
      await this.sendNotificationToRole('ADMIN', notification);
      await this.sendNotificationToRole('INSTRUCTOR', notification);
    } else {
      await this.sendNotificationToRole('ADMIN', notification);
    }
  }

  async notifyAlertResolved(alert: any) {
    await this.notifyEntityUpdated('alerts', alert.id, alert);
    
    await this.sendNotificationToUser(alert.resolvedBy, {
      title: 'Alerte résolue',
      message: `Alerte "${alert.title}" marquée comme résolue`,
      type: 'success',
      data: alert,
    });
  }

  // Étudiants
  async notifyStudentStatusChanged(student: any, oldStatus: string, newStatus: string) {
    await this.notifyEntityUpdated('students', student.id, student);
    
    await this.sendNotificationToRole('ADMIN', {
      title: 'Statut étudiant modifié',
      message: `${student.firstName} ${student.lastName}: ${oldStatus} → ${newStatus}`,
      type: 'info',
      data: { student, oldStatus, newStatus },
    });
  }

  // Cours
  async notifyNewCourseEnrollment(course: any, student: any) {
    await this.notifyEntityUpdated('courses', course.id, course);
    
    await this.sendNotificationToUser(course.instructor, {
      title: 'Nouvelle inscription',
      message: `${student.firstName} ${student.lastName} s'est inscrit au cours "${course.title}"`,
      type: 'info',
      data: { course, student },
    });
  }

  async notifyCourseScheduleChange(course: any, schedule: any) {
    await this.notifyEntityUpdated('courses', course.id, course);
    await this.notifyEntityUpdated('schedules', schedule.id, schedule);
    
    // Notifier tous les étudiants inscrits
    if (course.enrolledStudents && course.enrolledStudents.length > 0) {
      const targetUsers = course.enrolledStudents.map(s => s.userId);
      
      targetUsers.forEach(userId => {
        this.sendNotificationToUser(userId, {
          title: 'Modification d\'horaire',
          message: `L'horaire du cours "${course.title}" a été modifié`,
          type: 'warning',
          data: { course, schedule },
        });
      });
    }
  }

  // ==================== STATISTIQUES TEMPS RÉEL ====================

  async getRealtimeStats() {
    if (!this.server) return null;

    const sockets = await this.server.fetchSockets();
    const connectedUsers = sockets.length;
    
    // Grouper par rôles
    const usersByRole = {};
    sockets.forEach(socket => {
      if (socket.data?.user?.role) {
        const role = socket.data.user.role;
        usersByRole[role] = (usersByRole[role] || 0) + 1;
      }
    });

    return {
      connectedUsers,
      usersByRole,
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  // ==================== MAINTENANCE ====================

  async disconnectUser(userId: number, reason: string = 'Administrateur') {
    if (!this.server) return;

    const sockets = await this.server.in(`user_${userId}`).fetchSockets();
    
    sockets.forEach(socket => {
      socket.emit('force_disconnect', { reason });
      socket.disconnect();
    });

    this.logger.log(`👤 Utilisateur ${userId} déconnecté de force: ${reason}`);
  }

  async sendMaintenanceNotice(message: string, delayMinutes: number = 5) {
    if (!this.server) return;

    const notice = {
      title: 'Maintenance programmée',
      message,
      type: 'warning' as const,
      data: {
        delayMinutes,
        scheduledTime: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(),
      },
    };

    this.server.emit('maintenance_notice', notice);
    this.logger.log(`🔧 Notice de maintenance diffusée: ${delayMinutes} minutes`);
  }
}