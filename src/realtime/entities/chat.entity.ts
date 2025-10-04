import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatParticipant } from './chat-participant.entity';

export enum ChatType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  CLASS = 'CLASS',
  COURSE = 'COURSE'
}

@Entity('chats')
@Index(['type', 'isDeleted'])
@Index(['createdBy', 'isDeleted'])
@Index(['lastActivity'])
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: ChatType
  })
  type: ChatType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  isPrivate: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column()
  createdBy: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActivity: Date;

  @Column({ nullable: true })
  lastMessageId: number;

  @ManyToOne(() => ChatMessage, { eager: false })
  @JoinColumn({ name: 'lastMessageId' })
  lastMessage: ChatMessage;

  @Column({ type: 'json', nullable: true })
  metadata: {
    courseId?: number;
    classId?: string;
    maxParticipants?: number;
    autoJoin?: boolean;
    [key: string]: any;
  };

  @OneToMany(() => ChatMessage, message => message.chat)
  messages: ChatMessage[];

  @OneToMany(() => ChatParticipant, participant => participant.chat)
  participants: ChatParticipant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}