import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Alert } from '../../alerts/entities/alert.entity';
import { Absence } from '../../absences/entities/absence.entity';
import { Room } from '../../rooms/entities/room.entity';
import { ExitPermission } from '../../exit-permissions/entities/exit-permission.entity';
import { Movement } from '../../movements/entities/movement.entity';

export enum StudentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  GRADUATED = 'graduated'
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ name: 'student_number', unique: true, length: 20 })
  studentNumber: string;

  @Column({ length: 50 })
  class: string;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ACTIVE
  })
  status: StudentStatus;

  @Column({ name: 'enrollment_date', type: 'date' })
  enrollmentDate: Date;

  @Column({ name: 'graduation_date', type: 'date', nullable: true })
  graduationDate: Date | null;

  @Column({ name: 'room_id', nullable: true })
  roomId: number | null;

  @Column({ name: 'is_in_residence', default: false })
  isInResidence: boolean; // Statut actuel : dans ou hors résidence

  @Column({ type: 'datetime', name: 'last_movement_at', nullable: true })
  lastMovementAt: Date | null; // Timestamp du dernier mouvement

  // Relations
  @OneToOne(() => User, user => user.student)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Room, room => room.students, { nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room | null;

  @OneToMany(() => Alert, alert => alert.student)
  alerts: Alert[];

  @OneToMany(() => Absence, absence => absence.student)
  absences: Absence[];

  @OneToMany(() => ExitPermission, permission => permission.student)
  exitPermissions: ExitPermission[];

  @OneToMany(() => Movement, movement => movement.student)
  movements: Movement[];
}