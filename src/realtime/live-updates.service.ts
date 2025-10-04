import { Injectable, Logger } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

export interface LiveUpdateEvent {
  entity: string;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  id: number | string;
  data: any;
  userId?: number;
  timestamp: Date;
  metadata?: {
    changes?: { [key: string]: { old: any, new: any } };
    reason?: string;
    source?: string;
  };
}

@Injectable()
export class LiveUpdatesService {
  private readonly logger = new Logger(LiveUpdatesService.name);
  private updateQueue: LiveUpdateEvent[] = [];
  private isProcessing = false;

  constructor(
    private readonly realtimeService: RealtimeService,
  ) {
    // Traitement périodique de la queue d'événements
    setInterval(() => {
      this.processUpdateQueue();
    }, 1000); // Chaque seconde
  }

  // ==================== MÉTHODES PUBLIQUES ====================

  async broadcastEntityUpdate(event: LiveUpdateEvent) {
    try {
      // Ajouter à la queue pour traitement
      this.updateQueue.push({
        ...event,
        timestamp: new Date(),
      });

      this.logger.debug(`📡 Événement ajouté à la queue: ${event.entity}#${event.id} ${event.action}`);

    } catch (error) {
      this.logger.error(`Erreur ajout événement: ${error.message}`, error.stack);
    }
  }

  // ==================== MÉTHODES SPÉCIFIQUES PAR ENTITÉ ====================

  // Étudiants
  async notifyStudentCreated(student: any) {
    await this.broadcastEntityUpdate({
      entity: 'students',
      action: 'created',
      id: student.id,
      data: student,
      timestamp: new Date(),
    });
  }
 
  async notifyStudentUpdated(studentId: number, newData: any, changes?: any) {
    await this.broadcastEntityUpdate({
      entity: 'students',
      action: 'updated',
      id: studentId,
      data: newData,
      metadata: { changes },
      timestamp: new Date(),
    });
  }

  async notifyStudentStatusChanged(studentId: number, student: any, oldStatus: string, newStatus: string) {
    await this.broadcastEntityUpdate({
      entity: 'students',
      action: 'status_changed',
      id: studentId,
      data: student,
      metadata: {
        changes: {
          status: { old: oldStatus, new: newStatus }
        }
      },
      timestamp: new Date(),
    });
  }

  // Absences
  async notifyAbsenceCreated(absence: any) {
    await this.broadcastEntityUpdate({
      entity: 'absences',
      action: 'created',
      id: absence.id,
      data: absence,
      timestamp: new Date(),
    });

    // Notification spéciale pour les absences non justifiées
    if (!absence.justified) {
      await this.realtimeService.sendNotificationToRole('ADMIN', {
        title: 'Absence non justifiée',
        message: `Nouvelle absence non justifiée pour l'étudiant ${absence.studentName}`,
        type: 'warning',
        data: absence,
      });
    }
  }

  async notifyAbsenceJustified(absence: any, justifiedBy: number) {
    await this.broadcastEntityUpdate({
      entity: 'absences',
      action: 'updated',
      id: absence.id,
      data: absence,
      userId: justifiedBy,
      metadata: {
        reason: 'Absence justifiée',
        changes: {
          justified: { old: false, new: true }
        }
      },
      timestamp: new Date(),
    });
  }

  // Alertes
  async notifyAlertCreated(alert: any) {
    await this.broadcastEntityUpdate({
      entity: 'alerts',
      action: 'created',
      id: alert.id,
      data: alert,
      timestamp: new Date(),
    });

    // Notification d'urgence pour les alertes critiques
    if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
      await this.realtimeService.sendSystemAlert({
        level: 'critical',
        title: 'Alerte critique',
        message: alert.message,
        targetRoles: ['ADMIN'],
        data: alert,
      });
    }
  }

  async notifyAlertResolved(alert: any, resolvedBy: number) {
    await this.broadcastEntityUpdate({
      entity: 'alerts',
      action: 'updated',
      id: alert.id,
      data: alert,
      userId: resolvedBy,
      metadata: {
        reason: 'Alerte résolue',
        changes: {
          status: { old: 'OPEN', new: 'RESOLVED' }
        }
      },
      timestamp: new Date(),
    });
  }

  // Cours
  async notifyCourseCreated(course: any) {
    await this.broadcastEntityUpdate({
      entity: 'courses',
      action: 'created',
      id: course.id,
      data: course,
      timestamp: new Date(),
    });
  }

  async notifyCourseUpdated(courseId: number, course: any, changes?: any) {
    await this.broadcastEntityUpdate({
      entity: 'courses',
      action: 'updated',
      id: courseId,
      data: course,
      metadata: { changes },
      timestamp: new Date(),
    });
  }

  async notifyEnrollmentChanged(course: any, studentId: number, action: 'enrolled' | 'unenrolled') {
    await this.broadcastEntityUpdate({
      entity: 'courses',
      action: 'updated',
      id: course.id,
      data: course,
      metadata: {
        reason: `Étudiant ${action}`,
        changes: {
          enrolledStudents: { old: action === 'enrolled' ? course.enrolledStudents - 1 : course.enrolledStudents + 1, new: course.enrolledStudents }
        }
      },
      timestamp: new Date(),
    });

    // Notification à l'instructeur
    if (course.instructor) {
      await this.realtimeService.sendNotificationToUser(course.instructor, {
        title: action === 'enrolled' ? 'Nouvelle inscription' : 'Désinscription',
        message: `Un étudiant s'est ${action === 'enrolled' ? 'inscrit à' : 'désinscrit de'} votre cours "${course.title}"`,
        type: 'info',
        data: { course, studentId },
      });
    }
  }

  // Horaires
  async notifyScheduleCreated(schedule: any) {
    await this.broadcastEntityUpdate({
      entity: 'schedules',
      action: 'created',
      id: schedule.id,
      data: schedule,
      timestamp: new Date(),
    });
  }

  async notifyScheduleUpdated(scheduleId: number, schedule: any, changes?: any) {
    await this.broadcastEntityUpdate({
      entity: 'schedules',
      action: 'updated',
      id: scheduleId,
      data: schedule,
      metadata: { changes },
      timestamp: new Date(),
    });

    // Si changement d'horaire important, notifier tous les participants
    if (changes && (changes.date || changes.startTime || changes.endTime)) {
      await this.realtimeService.sendNotificationToRole('STUDENT', {
        title: 'Modification d\'horaire',
        message: `L'horaire de la session "${schedule.title}" a été modifié`,
        type: 'warning',
        data: schedule,
      });
    }
  }

  async notifyAttendanceUpdated(schedule: any, attendanceData: any) {
    await this.broadcastEntityUpdate({
      entity: 'schedules',
      action: 'updated',
      id: schedule.id,
      data: { ...schedule, attendance: attendanceData },
      metadata: {
        reason: 'Présences mises à jour',
        changes: {
          attendance: { old: schedule.attendance, new: attendanceData }
        }
      },
      timestamp: new Date(),
    });
  }

  // Fichiers
  async notifyFileUploaded(file: any, uploaderId: number) {
    await this.broadcastEntityUpdate({
      entity: 'files',
      action: 'created',
      id: file.id,
      data: file,
      userId: uploaderId,
      timestamp: new Date(),
    });

    // Notification aux administrateurs pour les nouveaux fichiers
    await this.realtimeService.sendNotificationToRole('ADMIN', {
      title: 'Nouveau fichier uploadé',
      message: `${file.originalName} a été uploadé par ${file.uploaderName || 'un utilisateur'}`,
      type: 'info',
      data: file,
    });
  }

  async notifyFileShared(file: any, sharedWith: number[], sharedBy: number) {
    await this.broadcastEntityUpdate({
      entity: 'files',
      action: 'updated',
      id: file.id,
      data: file,
      userId: sharedBy,
      metadata: {
        reason: 'Fichier partagé',
      },
      timestamp: new Date(),
    });

    // Notifier chaque utilisateur avec qui le fichier est partagé
    sharedWith.forEach(userId => {
      this.realtimeService.sendNotificationToUser(userId, {
        title: 'Fichier partagé avec vous',
        message: `Le fichier "${file.originalName}" a été partagé avec vous`,
        type: 'info',
        data: file,
      });
    });
  }

  // Utilisateurs
  async notifyUserStatusChanged(userId: number, user: any, oldStatus: boolean, newStatus: boolean) {
    await this.broadcastEntityUpdate({
      entity: 'users',
      action: 'status_changed',
      id: userId,
      data: user,
      metadata: {
        changes: {
          isActive: { old: oldStatus, new: newStatus }
        }
      },
      timestamp: new Date(),
    });
  }

  // ==================== STATISTIQUES TEMPS RÉEL ====================

  async broadcastStatisticsUpdate(statsType: string, data: any) {
    await this.broadcastEntityUpdate({
      entity: 'statistics',
      action: 'updated',
      id: statsType,
      data,
      metadata: {
        reason: 'Statistiques mises à jour',
        source: 'system',
      },
      timestamp: new Date(),
    });
  }

  async notifySystemMetricsUpdate(metrics: any) {
    await this.realtimeService.sendNotificationToRole('ADMIN', {
      title: 'Métriques système mises à jour',
      message: `Nouvelles métriques disponibles`,
      type: 'info',
      data: metrics,
    });
  }

  // ==================== TRAITEMENT DE LA QUEUE ====================

  private async processUpdateQueue() {
    if (this.isProcessing || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batchSize = 10; // Traiter par lots de 10
      const batch = this.updateQueue.splice(0, batchSize);

      for (const event of batch) {
        await this.processUpdateEvent(event);
      }

      if (batch.length > 0) {
        this.logger.debug(`📊 ${batch.length} événements traités`);
      }

    } catch (error) {
      this.logger.error(`Erreur traitement queue: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processUpdateEvent(event: LiveUpdateEvent) {
    try {
      // Diffuser via le service temps réel
      await this.realtimeService.broadcastNotification({
        title: `${event.entity} ${event.action}`,
        message: `Mise à jour en temps réel pour ${event.entity}`,
        type: 'info',
        data: {
          entity: event.entity,
          action: event.action,
          id: event.id,
          data: event.data,
          userId: event.userId,
          timestamp: event.timestamp,
          metadata: event.metadata,
        },
      });

      // Log pour debugging
      this.logger.debug(`📡 Événement diffusé: ${event.entity}#${event.id} ${event.action}`);

    } catch (error) {
      this.logger.error(`Erreur diffusion événement: ${error.message}`, error.stack);
      
      // En cas d'erreur, remettre l'événement en queue après un délai
      setTimeout(() => {
        this.updateQueue.unshift(event);
      }, 5000); // Réessayer dans 5 secondes
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  getQueueStats() {
    return {
      queueLength: this.updateQueue.length,
      isProcessing: this.isProcessing,
      oldestEvent: this.updateQueue.length > 0 ? this.updateQueue[0].timestamp : null,
    };
  }

  clearQueue() {
    const cleared = this.updateQueue.length;
    this.updateQueue = [];
    this.logger.log(`🧹 Queue vidée: ${cleared} événements supprimés`);
    return cleared;
  }

  async forceProcessQueue() {
    if (this.updateQueue.length > 0) {
      this.logger.log(`🔄 Traitement forcé de ${this.updateQueue.length} événements`);
      await this.processUpdateQueue();
    }
  }
}