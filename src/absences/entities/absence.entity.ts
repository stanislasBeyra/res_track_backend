import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';

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
  description: string | null;

  @Column({ default: false })
  justified: boolean;

  @Column({ type: 'varchar', name: 'justification_document', length: 255, nullable: true })
  justificationDocument: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'datetime', name: 'verified_at', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'int', name: 'verified_by', nullable: true })
  verifiedBy: number | null;

  // Relations
  @ManyToOne(() => Student, student => student.absences)
  @JoinColumn({ name: 'student_id' })
  student: Student;
}