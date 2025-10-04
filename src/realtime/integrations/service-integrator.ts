import { Injectable, Logger } from '@nestjs/common';
import { RealtimeService } from '../realtime.service';
import { LiveUpdatesService } from '../live-updates.service';
import { NotificationService } from '../notification.service';

/**
 * Service d'intégration pour connecter les modules existants au système temps réel
 * Ce service doit être injecté dans les autres modules pour déclencher les événements temps réel
 */
@Injectable()
export class ServiceIntegrator {
  private readonly logger = new Logger(ServiceIntegrator.name);

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly liveUpdatesService: LiveUpdatesService,
    private readonly notificationService: NotificationService,
  ) {}

  // ==================== INTÉGRATIONS ÉTUDIANTS ====================

  async onStudentCreated(student: any) {
    try {
      await this.liveUpdatesService.notifyStudentCreated(student);
      
      await this.realtimeService.sendNotificationToRole('ADMIN', {
        title: 'Nouvel étudiant inscrit',
        message: `${student.firstName} ${student.lastName} a été inscrit avec le numéro ${student.studentNumber}`,
        type: 'info',
        data: student,
      });

      this.logger.log(`✅ Événement étudiant créé intégré: ${student.id}`);
    } catch (error) {
      this.logger.error(`Erreur intégration étudiant créé: ${error.message}`, error.stack);
    }
  }

  async onStudentUpdated(studentId: number, newData: any, oldData: any) {
    try {
      const changes = this.detectChanges(oldData, newData);
      
      await this.liveUpdatesService.notifyStudentUpdated(studentId, newData, changes);

      // Notifier si changement de statut important
      if (changes.status) {
        await this.liveUpdatesService.notifyStudentStatusChanged(
          studentId, 
          newData, 
          changes.status.old, 
          changes.status.new
        );
      }

      this.logger.log(`✅ Événement étudiant mis à jour intégré: ${studentId}`);
    } catch (error) {
      this.logger.error(`Erreur intégration étudiant mis à jour: ${error.message}`, error.stack);
    }
  }

  // ==================== INTÉGRATIONS ABSENCES ====================

  async onAbsenceCreated(absence: any) {
    try {
      await this.liveUpdatesService.notifyAbsenceCreated(absence);
      await this.notificationService.notifyAbsenceCreated(absence);

      this.logger.log(`✅ Événement absence créée intégrée: ${absence.id}`);
    } catch (error) {
      this.logger.error(`Erreur intégration absence créée: ${error.message}`, error.stack);
    }
  }

  async onAbsenceJustified(absence: any, justifiedBy: number) {
    try {
      await this.liveUpdatesService.notifyAbsenceJustified(absence, justifiedBy);

      await this.realtimeService.sendNotificationToUser(justifiedBy, {
        title: 'Absence justifiée',
        message: `L'absence de ${absence.studentName} du ${absence.date} a été traitée`,
        type: 'success',
        data: absence,
      });

      this.logger.log(`✅ Événement absence justifiée intégrée: ${absence.id}`);
    } catch (error) {
      this.logger.error(`Erreur intégration absence justifiée: ${error.message}`, error.stack);
    }
  }

  // ==================== INTÉGRATIONS ALERTES ====================

  async onAlertCreated(alert: any) {
    try {
      await this.liveUpdatesService.notifyAlertCreated(alert);
      await this.notificationService.notifyAlertCreated(alert);

      this.logger.log(`✅ Événement alerte créée intégrée: ${alert.id}`);
    } catch (error) {
      this.logger.error(`Erreur intégration alerte créée: ${error.message}`, error.stack);
    }
  }

  async onAlertResolved(alert: any, resolvedBy: number) {
    try {
      await this.liveUpdatesService.notifyAlertResolved(alert, resolvedBy);

      await this.realtimeService.sendNotificationToRole('ADMIN', {
        title: 'Alerte résolue',
        message: `L'alerte "${alert.title}" a été résolue`,
        type: 'success',
        data: alert,
      });

      this.logger.log(`✅ Événement alerte résolue intégrée: ${alert.id}`);
    } catch (error) {
      this.logger.error(`Erreur intégration alerte résolue: ${error.message}`, error.stack);
    }
  }

  // ==================== INTÉGRATIONS COURS ====================

  async onCourseCreated(course: any) {
    try {
      await this.liveUpdatesService.notifyCourseCreated(course);

      await this.realtimeService.sendNotificationToRole('STUDENT', {
        title: 'Nouveau cours disponible',
        message: `Le cours "${course.title}" est maintenant disponible pour inscription`,
        type: 'info',
        data: course,
      });

      this.logger.log(`✅ Événement cours créé intégré: ${course.id}`);
    } catch (error) {
      this.logger.error(`Erreur intégration cours créé: ${error.message}`, error.stack);
    }
  }

  async onCourseEnrollment(course: any, studentId: number, action: 'enrolled' | 'unenrolled') {
    try {
      await this.liveUpdatesService.notifyEnrollmentChanged(course, studentId, action);

      this.logger.log(`✅ Événement inscription cours intégré: ${course.id} - ${action}`);
    } catch (error) {
      this.logger.error(`Erreur intégration inscription cours: ${error.message}`, error.stack);
    }
  }

  // ==================== INTÉGRATIONS HORAIRES ====================

  async onScheduleCreated(schedule: any) {
    try {
      await this.liveUpdatesService.notifyScheduleCreated(schedule);

      // Notifier les étudiants concernés
      if (schedule.courseId) {
        await this.realtimeService.sendNotificationToRole('STUDENT', {
          title: 'Nouvelle session programmée',
          message: `Une nouvelle session "${schedule.title}" a été programmée le ${schedule.date}`,
          type: 'info',
          data: schedule,
        });
      }

      this.logger.log(`✅ Événement horaire créé intégré: ${schedule.id}`);
    } catch (error) {
      this.logger.error(`Erreur intégration horaire créé: ${error.message}`, error.stack);
    }
  }

  async onAttendanceUpdated(schedule: any, attendanceData: any) {
    try {
      await this.liveUpdatesService.notifyAttendanceUpdated(schedule, attendanceData);

      // Calculer statistiques rapides
      const presentCount = attendanceData.filter(a => a.status === 'PRESENT').length;
      const totalCount = attendanceData.length;
      const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

      await this.realtimeService.sendNotificationToRole('INSTRUCTOR', {
        title: 'Présences mises à jour',
        message: `Session "${schedule.title}": ${presentCount}/${totalCount} présents (${attendanceRate}%)`,
        type: 'info',
        data: { schedule, attendanceData, stats: { presentCount, totalCount, attendanceRate } },
      });

      this.logger.log(`✅ Événement présences mises à jour intégré: ${schedule.id}`);
    } catch (error) {
      this.logger.error(`Erreur intégration présences: ${error.message}`, error.stack);
    }
  }

  // ==================== INTÉGRATIONS FICHIERS ====================

  async onFileUploaded(file: any, uploaderId: number) {
    try {
      await this.liveUpdatesService.notifyFileUploaded(file, uploaderId);

      this.logger.log(`✅ Événement fichier uploadé intégré: ${file.id}`);
    } catch (error) {
      this.logger.error(`Erreur intégration fichier uploadé: ${error.message}`, error.stack);
    }
  }

  async onFileShared(file: any, sharedWith: number[], sharedBy: number) {
    try {
      await this.liveUpdatesService.notifyFileShared(file, sharedWith, sharedBy);

      this.logger.log(`✅ Événement fichier partagé intégré: ${file.id}`);
    } catch (error) {
      this.logger.error(`Erreur intégration fichier partagé: ${error.message}`, error.stack);
    }
  }

  // ==================== INTÉGRATIONS UTILISATEURS ====================

  async onUserStatusChanged(userId: number, user: any, oldStatus: boolean, newStatus: boolean) {
    try {
      await this.liveUpdatesService.notifyUserStatusChanged(userId, user, oldStatus, newStatus);

      const statusText = newStatus ? 'activé' : 'désactivé';
      await this.realtimeService.sendNotificationToRole('ADMIN', {
        title: 'Statut utilisateur modifié',
        message: `L'utilisateur ${user.email} a été ${statusText}`,
        type: newStatus ? 'success' : 'warning',
        data: user,
      });

      this.logger.log(`✅ Événement statut utilisateur intégré: ${userId}`);
    } catch (error) {
      this.logger.error(`Erreur intégration statut utilisateur: ${error.message}`, error.stack);
    }
  }

  // ==================== INTÉGRATIONS SYSTÈME ====================

  async onSystemAlert(alert: {
    level: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    data?: any;
  }) {
    try {
      await this.realtimeService.sendSystemAlert({
        level: alert.level,
        title: alert.title,
        message: alert.message,
        targetRoles: ['ADMIN'],
        data: alert.data,
      });

      this.logger.log(`✅ Alerte système intégrée: ${alert.title}`);
    } catch (error) {
      this.logger.error(`Erreur intégration alerte système: ${error.message}`, error.stack);
    }
  }

  async onStatisticsUpdate(statsType: string, data: any) {
    try {
      await this.liveUpdatesService.broadcastStatisticsUpdate(statsType, data);

      this.logger.debug(`✅ Statistiques mises à jour intégrées: ${statsType}`);
    } catch (error) {
      this.logger.error(`Erreur intégration statistiques: ${error.message}`, error.stack);
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  private detectChanges(oldData: any, newData: any): { [key: string]: { old: any, new: any } } {
    const changes: { [key: string]: { old: any, new: any } } = {};

    if (!oldData || !newData) return changes;

    for (const key in newData) {
      if (oldData.hasOwnProperty(key) && oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key],
        };
      }
    }

    return changes;
  }

  // ==================== MÉTHODES DE TEST ====================

  async testIntegration() {
    try {
      await this.realtimeService.broadcastNotification({
        title: 'Test d\'intégration',
        message: 'Le système temps réel fonctionne correctement',
        type: 'success',
      });

      this.logger.log('✅ Test d\'intégration réussi');
      return true;
    } catch (error) {
      this.logger.error(`❌ Test d\'intégration échoué: ${error.message}`, error.stack);
      return false;
    }
  }
}