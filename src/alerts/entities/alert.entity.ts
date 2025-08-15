import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';

export enum AlertType {
  LATE = 'late',
  ABSENCE = 'absence',
  BEHAVIOR = 'behavior',
  PERFORMANCE = 'performance',
  OTHER = 'other'
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @Column({
    type: 'enum',
    enum: AlertType
  })
  type: AlertType;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  resolved: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: number;

  // Relations
  @ManyToOne(() => Student, student => student.alerts)
  @JoinColumn({ name: 'student_id' })
  student: Student;
}