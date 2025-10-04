import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Statistic, StatisticType, StatisticPeriod } from './entities/statistic.entity';
import { DashboardOverviewDto, StudentStatisticsDto, AbsenceStatisticsDto, PerformanceTrendsDto, AlertStatisticsDto } from './dto/dashboard-stats.dto';
import { StudentsService } from '../students/students.service';
import { AbsencesService } from '../absences/absences.service';
import { AlertsService } from '../alerts/alerts.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    @InjectRepository(Statistic)
    private statisticRepository: Repository<Statistic>,
    private studentsService: StudentsService,
    private absencesService: AbsencesService,
    private alertsService: AlertsService,
    private usersService: UsersService,
  ) {}

  async getDashboardOverview(): Promise<DashboardOverviewDto> {
    try {
      this.logger.log('Génération des statistiques du tableau de bord');

      const [students, absences] = await Promise.all([
        this.studentsService.findAll(),
        this.absencesService.findAll(),
      ]);

      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Étudiants
      const totalStudents = students.length;
      const activeStudents = students.filter(s => s.status === 'active').length;
      const inactiveStudents = totalStudents - activeStudents;

      // Croissance hebdomadaire simulée (à implémenter avec de vraies données)
      const weeklyGrowth = Math.round(Math.random() * 10); // Simulé

      // Absences
      const totalAbsences = absences.length;
      const todayStr = today.toISOString().split('T')[0];
      const todayAbsences = absences.filter(a => {
        const absenceDate = new Date(a.date).toISOString().split('T')[0];
        return absenceDate === todayStr;
      }).length;

      // Alertes (simulation pour l'instant)
      const activeAlerts = Math.floor(Math.random() * 50);

      // Temps de réponse moyen (simulé)
      const averageResponseTime = Math.round(Math.random() * 24 * 100) / 100;

      // Taux d'assiduité moyen
      const totalDays = 30; // Simulé sur 30 jours
      const averageAttendanceRate = totalDays > 0 ? 
        Math.round(((totalDays * totalStudents - totalAbsences) / (totalDays * totalStudents)) * 10000) / 100 : 0;

      // Cours (simulé)
      const totalCourses = Math.floor(Math.random() * 20) + 10;
      const activeCourses = Math.floor(Math.random() * 8) + 2;

      return {
        totalStudents,
        activeStudents,
        inactiveStudents,
        weeklyGrowth,
        totalAbsences,
        todayAbsences,
        activeAlerts,
        averageResponseTime,
        averageAttendanceRate,
        totalCourses,
        activeCourses,
      };
    } catch (error) {
      this.logger.error(`Erreur génération overview: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStudentStatistics(): Promise<StudentStatisticsDto> {
    try {
      this.logger.log('Génération des statistiques des étudiants');

      const students = await this.studentsService.findAll();
      const absences = await this.absencesService.findAll();

      // Répartition active/inactive
      const activeInactiveDistribution = {
        active: students.filter(s => s.status === 'active').length,
        inactive: students.filter(s => s.status !== 'active').length,
        suspended: 0, // À implémenter selon votre logique
      };

      // Par niveau (simulation)
      const byLevel = students.reduce((acc, student) => {
        const level = `Level ${Math.floor(Math.random() * 4) + 1}`;
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Par classe (simulation)
      const byClass = students.reduce((acc, student) => {
        const className = `Class ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`;
        acc[className] = (acc[className] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Inscriptions par mois (simulation basée sur les dates d'inscription)
      const enrollmentByMonth = this.generateMonthlyData('enrollments');

      // Top assiduité et plus absents
      const studentAbsenceCounts = students.map(student => {
        const studentAbsences = absences.filter(a => a.studentId === student.id);
        const attendanceRate = Math.max(0, 100 - (studentAbsences.length * 2)); // Simulation
        
        return {
          studentId: student.id,
          studentName: `${student.user?.profile?.firstName || 'Prénom'} ${student.user?.profile?.lastName || 'Nom'}`,
          attendanceRate,
          absenceCount: studentAbsences.length,
        };
      });

      const topAttendance = studentAbsenceCounts
        .sort((a, b) => b.attendanceRate - a.attendanceRate)
        .slice(0, 10)
        .map(s => ({
          studentId: s.studentId,
          studentName: s.studentName,
          attendanceRate: s.attendanceRate,
        }));

      const mostAbsent = studentAbsenceCounts
        .filter(s => s.absenceCount > 0)
        .sort((a, b) => b.absenceCount - a.absenceCount)
        .slice(0, 10)
        .map(s => ({
          studentId: s.studentId,
          studentName: s.studentName,
          absenceCount: s.absenceCount,
        }));

      return {
        activeInactiveDistribution,
        byLevel,
        byClass,
        enrollmentByMonth,
        topAttendance,
        mostAbsent,
      };
    } catch (error) {
      this.logger.error(`Erreur génération stats étudiants: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAbsenceStatistics(): Promise<AbsenceStatisticsDto> {
    try {
      this.logger.log('Génération des statistiques des absences');

      const absences = await this.absencesService.findAll();

      // Par période (7 derniers jours)
      const byPeriod = this.getLast7DaysStats(absences);

      // Par jour de la semaine
      const byDayOfWeek = this.getAbsencesByDayOfWeek(absences);

      // Par mois
      const byMonth = this.generateMonthlyData('absences');

      // Par raison
      const byReason = absences.reduce((acc, absence) => {
        const reason = absence.reason || 'Non spécifiée';
        const existing = acc.find(r => r.reason === reason);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ reason, count: 1 });
        }
        return acc;
      }, [] as { reason: string; count: number }[])
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

      // Taux de justification
      const totalAbsences = absences.length;
      const justifiedAbsences = absences.filter(a => a.justified).length;
      const justificationRate = totalAbsences > 0 ? 
        Math.round((justifiedAbsences / totalAbsences) * 10000) / 100 : 0;

      // Durée moyenne (simulation)
      const averageDuration = Math.round(Math.random() * 8 * 100) / 100; // 0-8 heures

      return {
        byPeriod,
        byDayOfWeek,
        byMonth,
        byReason,
        justificationRate,
        averageDuration,
      };
    } catch (error) {
      this.logger.error(`Erreur génération stats absences: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPerformanceTrends(): Promise<PerformanceTrendsDto> {
    try {
      this.logger.log('Génération des tendances de performance');

      // Simulation des tendances sur les 12 derniers mois
      const months = this.getLast12Months();

      const attendanceTrends = months.map(month => ({
        period: month,
        rate: Math.round((80 + Math.random() * 15) * 100) / 100, // 80-95%
      }));

      const alertsTrends = months.map(month => ({
        period: month,
        total: Math.floor(Math.random() * 50) + 10,
        resolved: Math.floor(Math.random() * 40) + 5,
      }));

      const resolutionTimeTrends = months.map(month => ({
        period: month,
        averageHours: Math.round((Math.random() * 48 + 2) * 100) / 100, // 2-50h
      }));

      const satisfactionTrends = months.map(month => ({
        period: month,
        score: Math.round((3.5 + Math.random() * 1.5) * 10) / 10, // 3.5-5.0
      }));

      return {
        attendanceTrends,
        alertsTrends,
        resolutionTimeTrends,
        satisfactionTrends,
      };
    } catch (error) {
      this.logger.error(`Erreur génération tendances performance: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAlertStatistics(): Promise<AlertStatisticsDto> {
    try {
      this.logger.log('Génération des statistiques des alertes');

      // Simulation des données d'alertes
      const byType = {
        'ABSENCE': Math.floor(Math.random() * 100) + 50,
        'LATE': Math.floor(Math.random() * 50) + 20,
        'BEHAVIOR': Math.floor(Math.random() * 30) + 10,
        'PERFORMANCE': Math.floor(Math.random() * 40) + 15,
        'OTHER': Math.floor(Math.random() * 20) + 5,
      };

      const bySeverity = {
        'LOW': Math.floor(Math.random() * 50) + 30,
        'MEDIUM': Math.floor(Math.random() * 60) + 40,
        'HIGH': Math.floor(Math.random() * 40) + 20,
        'CRITICAL': Math.floor(Math.random() * 20) + 5,
      };

      const totalAlerts = Object.values(byType).reduce((sum, count) => sum + count, 0);
      const resolvedCount = Math.floor(totalAlerts * 0.7); // 70% résolues
      
      const byStatus = {
        resolved: resolvedCount,
        pending: Math.floor((totalAlerts - resolvedCount) * 0.8),
        overdue: Math.floor((totalAlerts - resolvedCount) * 0.2),
      };

      const resolutionTimeByType = Object.keys(byType).map(type => ({
        type,
        averageHours: Math.round((Math.random() * 72 + 1) * 100) / 100,
      }));

      const topResolvers = Array.from({ length: 5 }, (_, i) => ({
        userId: i + 1,
        userName: `Resolver ${i + 1}`,
        resolvedCount: Math.floor(Math.random() * 50) + 10,
      })).sort((a, b) => b.resolvedCount - a.resolvedCount);

      return {
        byType,
        bySeverity,
        byStatus,
        resolutionTimeByType,
        topResolvers,
      };
    } catch (error) {
      this.logger.error(`Erreur génération stats alertes: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Méthodes utilitaires privées
  private getLast7DaysStats(absences: any[]): any[] {
    const result: Array<{ date: string; total: number; justified: number; unjustified: number }> = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayAbsences = absences.filter(a => {
        const absenceDate = new Date(a.date).toISOString().split('T')[0];
        return absenceDate === dateStr;
      });
      const justified = dayAbsences.filter(a => a.justified).length;
      const unjustified = dayAbsences.length - justified;

      result.push({
        date: dateStr,
        total: dayAbsences.length,
        justified,
        unjustified,
      });
    }

    return result;
  }

  private getAbsencesByDayOfWeek(absences: any[]): any[] {
    const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const counts = new Array(7).fill(0);

    absences.forEach(absence => {
      const date = new Date(absence.date);
      const dayIndex = (date.getDay() + 6) % 7; // Lundi = 0
      counts[dayIndex]++;
    });

    return daysOfWeek.map((day, index) => ({
      day,
      count: counts[index],
    }));
  }

  private generateMonthlyData(type: string): any[] {
    const months = this.getLast12Months();
    return months.map(month => ({
      month,
      count: Math.floor(Math.random() * 30) + 5,
    }));
  }

  private getLast12Months(): string[] {
    const months: string[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      months.push(date.toISOString().substring(0, 7)); // YYYY-MM
    }

    return months;
  }

  // Sauvegarde des statistiques (pour cache/historique)
  async saveStatistic(type: StatisticType, period: StatisticPeriod, data: any): Promise<Statistic> {
    const statistic = this.statisticRepository.create({
      type,
      period,
      date: new Date(),
      data,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
      },
    });

    return await this.statisticRepository.save(statistic);
  }

  async getHistoricalStatistics(
    type: StatisticType, 
    startDate: Date, 
    endDate: Date
  ): Promise<Statistic[]> {
    return await this.statisticRepository.find({
      where: {
        type,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });
  }
}