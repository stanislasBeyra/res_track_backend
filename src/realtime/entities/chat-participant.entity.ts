import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../../users/entities/user.entity';

export enum ParticipantRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

@Entity('chat_participants')
@Index(['chatId', 'userId'], { unique: true })
@Index(['userId', 'isActive'])
@Index(['chatId', 'isActive'])
export class ChatParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chatId: string;

  @ManyToOne(() => Chat, chat => chat.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @Column()
  userId: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.MEMBER
  })
  role: ParticipantRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ default: false })
  isMuted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  mutedUntil: Date;

  @Column()
  addedBy: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'addedBy' })
  addedByUser: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastReadAt: Date;

  @Column({ type: 'json', nullable: true })
  settings: {
    notifications?: boolean;
    soundEnabled?: boolean;
    customNickname?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}