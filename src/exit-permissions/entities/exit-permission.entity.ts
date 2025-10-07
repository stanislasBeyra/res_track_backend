import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Movement } from '../../movements/entities/movement.entity';

export enum ExitReason {
  FAMILY = 'family',
  MEDICAL = 'medical',
  PERSONAL = 'personal',
  EMERGENCY = 'emergency',
  ACADEMIC = 'academic',
  OTHER = 'other'
}

export enum PermissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  USED = 'used'
}

@Entity('exit_permissions')
export class ExitPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @Column({ name: 'exit_code', unique: true, length: 50 })
  exitCode: string; // Code unique : EXIT-2024-001234

  @Column({ name: 'qr_code', type: 'text', nullable: true })
  qrCode: string | null; // QR code en base64 ou URL

  @Column({
    type: 'enum',
    enum: ExitReason
  })
  reason: ExitReason;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'datetime', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'datetime', name: 'end_time' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: PermissionStatus,
    default: PermissionStatus.PENDING
  })
  status: PermissionStatus;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null; // ID de l'admin qui a validé

  @Column({ type: 'datetime', name: 'approved_at', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean; // Si le code a été utilisé pour sortir

  @Column({ type: 'datetime', name: 'used_at', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Student, student => student.exitPermissions)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @OneToMany(() => Movement, movement => movement.exitPermission)
  movements: Movement[];
}
