import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReportType {
  ATTENDANCE = 'ATTENDANCE',
  ABSENCES = 'ABSENCES',
  ALERTS = 'ALERTS',
  PERFORMANCE = 'PERFORMANCE',
  OVERVIEW = 'OVERVIEW',
  CUSTOM = 'CUSTOM'
}

export enum ReportFormat {
  PDF = 'PDF',
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  JSON = 'JSON'
}

export enum ReportStatus {
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ReportType,
    default: ReportType.OVERVIEW
  })
  type: ReportType;

  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.PDF
  })
  format: ReportFormat;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.GENERATING
  })
  status: ReportStatus;

  @Column({ type: 'json', nullable: true })
  parameters: any | null;

  @Column({ type: 'json', nullable: true })
  data: any | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number | null;

  @Column({ type: 'date', nullable: true })
  periodStart: Date | null;

  @Column({ type: 'date', nullable: true })
  periodEnd: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column()
  generatedBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'generatedBy' })
  generator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;
}