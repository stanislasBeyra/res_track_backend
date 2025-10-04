import { ApiProperty } from '@nestjs/swagger';

export class DashboardOverviewDto {
  @ApiProperty({ description: 'Nombre total d\'étudiants' })
  totalStudents: number;

  @ApiProperty({ description: 'Étudiants actifs' })
  activeStudents: number;

  @ApiProperty({ description: 'Étudiants inactifs' })
  inactiveStudents: number;

  @ApiProperty({ description: 'Croissance hebdomadaire des utilisateurs' })
  weeklyGrowth: number;

  @ApiProperty({ description: 'Total des absences' })
  totalAbsences: number;

  @ApiProperty({ description: 'Absences aujourd\'hui' })
  todayAbsences: number;

  @ApiProperty({ description: 'Total des alertes actives' })
  activeAlerts: number;

  @ApiProperty({ description: 'Temps de réponse moyen (en heures)' })
  averageResponseTime: number;

  @ApiProperty({ description: 'Taux d\'assiduité moyen' })
  averageAttendanceRate: number;

  @ApiProperty({ description: 'Total des cours' })
  totalCourses: number;

  @ApiProperty({ description: 'Cours actifs aujourd\'hui' })
  activeCourses: number;
}

export class StudentStatisticsDto {
  @ApiProperty({ description: 'Répartition étudiants actifs/inactifs' })
  activeInactiveDistribution: {
    active: number;
    inactive: number;
    suspended: number;
  };

  @ApiProperty({ description: 'Étudiants par niveau' })
  byLevel: { [key: string]: number };

  @ApiProperty({ description: 'Étudiants par classe' })
  byClass: { [key: string]: number };

  @ApiProperty({ description: 'Inscriptions par mois' })
  enrollmentByMonth: {
    month: string;
    count: number;
  }[];

  @ApiProperty({ description: 'Top 10 étudiants les plus assidus' })
  topAttendance: {
    studentId: number;
    studentName: string;
    attendanceRate: number;
  }[];

  @ApiProperty({ description: 'Top 10 étudiants les plus absents' })
  mostAbsent: {
    studentId: number;
    studentName: string;
    absenceCount: number;
  }[];
}

export class AbsenceStatisticsDto {
  @ApiProperty({ description: 'Absences par période (7 derniers jours)' })
  byPeriod: {
    date: string;
    total: number;
    justified: number;
    unjustified: number;
  }[];

  @ApiProperty({ description: 'Absences par jour de la semaine' })
  byDayOfWeek: {
    day: string;
    count: number;
  }[];

  @ApiProperty({ description: 'Absences par mois' })
  byMonth: {
    month: string;
    count: number;
  }[];

  @ApiProperty({ description: 'Types d\'absences' })
  byReason: {
    reason: string;
    count: number;
  }[];

  @ApiProperty({ description: 'Taux de justification' })
  justificationRate: number;

  @ApiProperty({ description: 'Durée moyenne des absences (en heures)' })
  averageDuration: number;
}

export class PerformanceTrendsDto {
  @ApiProperty({ description: 'Évolution du taux d\'assiduité' })
  attendanceTrends: {
    period: string;
    rate: number;
  }[];

  @ApiProperty({ description: 'Évolution des alertes' })
  alertsTrends: {
    period: string;
    total: number;
    resolved: number;
  }[];

  @ApiProperty({ description: 'Temps de résolution des alertes' })
  resolutionTimeTrends: {
    period: string;
    averageHours: number;
  }[];

  @ApiProperty({ description: 'Satisfaction étudiante' })
  satisfactionTrends: {
    period: string;
    score: number;
  }[];
}

export class AlertStatisticsDto {
  @ApiProperty({ description: 'Alertes par type' })
  byType: { [key: string]: number };

  @ApiProperty({ description: 'Alertes par sévérité' })
  bySeverity: { [key: string]: number };

  @ApiProperty({ description: 'Alertes par statut' })
  byStatus: {
    resolved: number;
    pending: number;
    overdue: number;
  };

  @ApiProperty({ description: 'Temps de résolution moyen par type' })
  resolutionTimeByType: {
    type: string;
    averageHours: number;
  }[];

  @ApiProperty({ description: 'Alertes par utilisateur (top résolveurs)' })
  topResolvers: {
    userId: number;
    userName: string;
    resolvedCount: number;
  }[];
}