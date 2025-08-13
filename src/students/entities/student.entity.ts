import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Alert } from 'src/alerts/entities/alert.entity';

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
  graduationDate: Date;

  // Relations
  @OneToOne(() => User, user => user.student)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Alert, alert => alert.student)
  alerts: Alert[];

  // @OneToMany(() => Absence, absence => absence.student)
  // absences: Absence[];
}