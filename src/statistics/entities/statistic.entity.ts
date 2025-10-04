import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum StatisticType {
  OVERVIEW = 'OVERVIEW',
  STUDENTS = 'STUDENTS',
  ABSENCES = 'ABSENCES',
  ALERTS = 'ALERTS',
  PERFORMANCE = 'PERFORMANCE',
  ATTENDANCE = 'ATTENDANCE',
  COURSES = 'COURSES'
}

export enum StatisticPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM'
}

@Entity('statistics')
@Index(['type', 'period', 'date'])
export class Statistic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: StatisticType
  })
  type: StatisticType;

  @Column({
    type: 'enum',
    enum: StatisticPeriod
  })
  period: StatisticPeriod;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'json' })
  data: any;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ length: 255, nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}