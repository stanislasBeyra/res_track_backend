import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';

export enum ScheduleStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED'
}

export enum ScheduleType {
  REGULAR = 'REGULAR',
  MAKEUP = 'MAKEUP',
  EXAM = 'EXAM',
  PRACTICAL = 'PRACTICAL',
  PRESENTATION = 'PRESENTATION',
  FIELD_TRIP = 'FIELD_TRIP'
}

export enum RecurrenceType {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM'
}

@Entity('schedules')
@Index(['courseId', 'date'])
@Index(['instructorId', 'date'])
@Index(['status', 'date'])
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  courseId: number;

  @ManyToOne(() => Course, { eager: false })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ nullable: true })
  instructorId: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ length: 100, nullable: true })
  room: string;

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    default: ScheduleStatus.ACTIVE
  })
  status: ScheduleStatus;

  @Column({
    type: 'enum',
    enum: ScheduleType,
    default: ScheduleType.REGULAR
  })
  type: ScheduleType;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  attendees: number;

  @Column({
    type: 'enum',
    enum: RecurrenceType,
    default: RecurrenceType.NONE
  })
  recurrenceType: RecurrenceType;

  @Column({ type: 'json', nullable: true })
  recurrencePattern: {
    frequency: number;
    daysOfWeek?: number[];
    endDate?: string;
    maxOccurrences?: number;
  } | null;

  @Column({ type: 'json', nullable: true })
  resources: {
    equipment?: string[];
    materials?: string[];
    software?: string[];
  };

  @Column({ type: 'json', nullable: true })
  agenda: {
    topic: string;
    duration: number;
    description?: string;
  }[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  requirements: string;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ type: 'text', nullable: true })
  onlineLink: string;

  @Column({ type: 'text', nullable: true })
  recordingLink: string;

  @Column({ type: 'json', nullable: true })
  notifications: {
    emailReminder?: boolean;
    smsReminder?: boolean;
    reminderTime?: number;
  };

  @Column({ type: 'json', nullable: true })
  attendance: {
    studentId: number;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    arrivalTime?: string;
    notes?: string;
  }[];

  @Column({ type: 'json', nullable: true })
  metadata: {
    isRecorded?: boolean;
    recordingDuration?: number;
    avgAttendanceRate?: number;
    feedback?: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}