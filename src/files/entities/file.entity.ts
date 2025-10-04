import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum FileType {
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  ARCHIVE = 'ARCHIVE',
  OTHER = 'OTHER'
}

export enum FileStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
  PROCESSING = 'PROCESSING'
}

export enum FileVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  SHARED = 'SHARED'
}

@Entity('files')
@Index(['uploaderId', 'status'])
@Index(['type', 'status'])
@Index(['originalName'])
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  originalName: string;

  @Column({ length: 255, unique: true })
  fileName: string;

  @Column({ length: 500 })
  filePath: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({
    type: 'enum',
    enum: FileType
  })
  type: FileType;

  @Column({
    type: 'enum',
    enum: FileStatus,
    default: FileStatus.ACTIVE
  })
  status: FileStatus;

  @Column({
    type: 'enum',
    enum: FileVisibility,
    default: FileVisibility.PRIVATE
  })
  visibility: FileVisibility;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ type: 'int', nullable: true })
  uploaderId: number | null;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @Column({ type: 'int', default: 0 })
  downloadCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastDownloaded: Date | null;

  @Column({ type: 'json', nullable: true })
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    encoding?: string;
    compression?: string;
    checksum?: string;
  } | null;

  @Column({ type: 'json', nullable: true })
  access: {
    allowedUsers?: number[];
    allowedRoles?: string[];
    expiresAt?: Date;
    downloadLimit?: number;
  } | null;

  @Column({ type: 'text', nullable: true })
  thumbnail: string | null;

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'text', nullable: true })
  encryptionKey: string | null;

  @Column({ type: 'date', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isProcessed: boolean;

  @Column({ type: 'json', nullable: true })
  versions: {
    version: string;
    fileName: string;
    filePath: string;
    size: number;
    createdAt: Date;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}