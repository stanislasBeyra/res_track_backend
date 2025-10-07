import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Student } from '../../students/entities/student.entity';

export enum RoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
  RESERVED = 'reserved'
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'room_number', unique: true, length: 20 })
  roomNumber: string;

  @Column({ length: 50 })
  building: string;

  @Column({ type: 'int' })
  floor: number;

  @Column({ type: 'int', default: 1 })
  capacity: number;

  @Column({ type: 'int', name: 'current_occupants', default: 0 })
  currentOccupants: number;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.AVAILABLE
  })
  status: RoomStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Relations
  @OneToMany(() => Student, student => student.room)
  students: Student[];
}
