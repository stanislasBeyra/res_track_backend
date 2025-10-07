import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { ExitPermission } from '../../exit-permissions/entities/exit-permission.entity';

export enum MovementType {
  ENTRY = 'entry',   // Entrée dans la résidence
  EXIT = 'exit'      // Sortie de la résidence
}

export enum MovementMethod {
  QR_CODE = 'qr_code',
  MANUAL_CODE = 'manual_code',
  MANUAL_ADMIN = 'manual_admin',
  AUTOMATIC = 'automatic'
}

@Entity('movements')
export class Movement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @Column({ name: 'exit_permission_id', nullable: true })
  exitPermissionId: number | null;

  @Column({
    type: 'enum',
    enum: MovementType
  })
  type: MovementType;

  @Column({
    type: 'enum',
    enum: MovementMethod,
    default: MovementMethod.QR_CODE
  })
  method: MovementMethod;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'recorded_by', type: 'int', nullable: true })
  recordedBy: number | null; // ID de l'admin/gardien qui a enregistré (si manuel)

  @Column({ name: 'has_permission', default: false })
  hasPermission: boolean; // Si la sortie avait une permission valide

  @Column({ name: 'is_valid', default: true })
  isValid: boolean; // Si le mouvement est valide (pas d'anomalie)

  // Relations
  @ManyToOne(() => Student, student => student.movements)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => ExitPermission, permission => permission.movements, { nullable: true })
  @JoinColumn({ name: 'exit_permission_id' })
  exitPermission: ExitPermission | null;
}
