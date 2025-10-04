import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Student } from '../../students/entities/student.entity';
import { Absence } from '../../absences/entities/absence.entity';

export enum CourseStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export enum CourseDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

@Entity('courses')
@Index(['status', 'startDate'])
@Index(['instructor', 'status'])
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100 })
  code: string;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.ACTIVE
  })
  status: CourseStatus;

  @Column({
    type: 'enum',
    enum: CourseDifficulty,
    default: CourseDifficulty.BEGINNER
  })
  difficulty: CourseDifficulty;

  @Column({ type: 'int', default: 0 })
  credits: number;

  @Column({ type: 'int', default: 30 })
  maxStudents: number;

  @Column({ type: 'int', default: 0 })
  enrolledStudents: number;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column({ type: 'json', nullable: true })
  schedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
  }[];

  @Column({ length: 255, nullable: true })
  room: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'json', nullable: true })
  prerequisites: string[];

  @Column({ type: 'json', nullable: true })
  objectives: string[];

  @Column({ type: 'json', nullable: true })
  materials: string[];

  @Column({ type: 'text', nullable: true })
  syllabus: string;

  @Column({ nullable: true })
  instructor: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'instructor' })
  instructorDetails: User;

  @Column({ type: 'json', nullable: true })
  metadata: {
    category?: string;
    tags?: string[];
    language?: string;
    duration?: number;
    certificateEligible?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Absence, absence => absence.course)
  absences: Absence[];
}