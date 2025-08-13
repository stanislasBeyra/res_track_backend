import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from 'src/students/entities/student.entity';

export enum AbsenceReason {
  ILLNESS = 'illness',
  FAMILY = 'family',
  MEDICAL = 'medical',
  VACATION = 'vacation',
  OTHER = 'other',
  UNKNOWN = 'unknown'
}

@Entity('absences')
export class Absence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: AbsenceReason,
    default: AbsenceReason.UNKNOWN
  })
  reason: AbsenceReason;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  justified: boolean;

  @Column({ name: 'justification_document', length: 255, nullable: true })
  justificationDocument: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'verified_at', nullable: true })
  verifiedAt: Date;

  @Column({ name: 'verified_by', nullable: true })
  verifiedBy: number;

  
}