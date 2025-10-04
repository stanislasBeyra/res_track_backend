import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FilesService } from './files.service';
import { File, FileType, FileStatus, FileVisibility } from './entities/file.entity';
import { UsersService } from '../users/users.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Mock fs and crypto modules
jest.mock('fs');
jest.mock('path');
jest.mock('crypto');

describe('FilesService', () => {
  let service: FilesService;
  let fileRepository: Repository<File>;
  let usersService: UsersService;

  const mockFileRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockFile: File = {
    id: 1,
    originalName: 'test-file.pdf',
    fileName: '1234567890_abc123.pdf',
    filePath: './uploads/1234567890_abc123.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    type: FileType.DOCUMENT,
    status: FileStatus.ACTIVE,
    visibility: FileVisibility.PRIVATE,
    description: 'Test file',
    category: 'documents',
    tags: ['test'],
    uploaderId: 1,
    uploader: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    } as any,
    downloadCount: 0,
    lastDownloaded: null,
    metadata: { checksum: 'abc123' },
    access: { allowedUsers: [], allowedRoles: [] },
    thumbnail: null,
    isEncrypted: false,
    encryptionKey: null,
    expiresAt: null,
    isProcessed: true,
    versions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(File),
          useValue: mockFileRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    fileRepository = module.get<Repository<File>>(getRepositoryToken(File));
    usersService = module.get<UsersService>(UsersService);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mocks
    (fs.promises.writeFile as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (fs.promises.unlink as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (fs.existsSync as jest.Mock) = jest.fn().mockReturnValue(true);
    (fs.promises.readFile as jest.Mock) = jest.fn().mockResolvedValue(Buffer.from('test content'));
    (path.extname as jest.Mock) = jest.fn().mockReturnValue('.pdf');
    (path.join as jest.Mock) = jest.fn().mockReturnValue('./uploads/test.pdf');
    (crypto.randomBytes as jest.Mock) = jest.fn().mockReturnValue(Buffer.from('randomkey'));
    (crypto.createHash as jest.Mock) = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('hash123'),
    });
  });

  describe('uploadFile', () => {
    const uploadDto = {
      description: 'Test file',
      category: 'documents',
      tags: ['test'],
      visibility: FileVisibility.PRIVATE,
      encrypt: false,
    };

    const fileBuffer = Buffer.from('test file content');
    const originalName = 'test-file.pdf';
    const mimeType = 'application/pdf';
    const uploaderId = 1;

    beforeEach(() => {
      // Mock private methods
      service['determineFileType'] = jest.fn().mockReturnValue(FileType.DOCUMENT);
      service['extractMetadata'] = jest.fn().mockResolvedValue({ size: 1024 });
    });

    it('should upload a file successfully', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockFileRepository.create.mockReturnValue(mockFile);
      mockFileRepository.save.mockResolvedValue(mockFile);
      service.findOne = jest.fn().mockResolvedValue(mockFile);

      const result = await service.uploadFile(fileBuffer, originalName, mimeType, uploaderId, uploadDto);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(uploaderId);
      expect(mockFileRepository.create).toHaveBeenCalled();
      expect(mockFileRepository.save).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(result).toEqual(mockFile);
    });

    it('should throw BadRequestException if file size exceeds limit', async () => {
      const largeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB

      await expect(service.uploadFile(largeBuffer, originalName, mimeType, uploaderId, uploadDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should encrypt file if requested', async () => {
      const encryptDto = { ...uploadDto, encrypt: true };
      
      // Mock crypto functions for encryption
      const mockCipher = {
        update: jest.fn().mockReturnValue(Buffer.from('encrypted1')),
        final: jest.fn().mockReturnValue(Buffer.from('encrypted2')),
      };
      (crypto.createCipheriv as jest.Mock) = jest.fn().mockReturnValue(mockCipher);
      (crypto.createHash as jest.Mock) = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(Buffer.from('iv123456789012345')),
      });

      mockUsersService.findOne.mockResolvedValue(mockUser);
      const encryptedFile = { ...mockFile, isEncrypted: true, encryptionKey: 'key123' };
      mockFileRepository.create.mockReturnValue(encryptedFile);
      mockFileRepository.save.mockResolvedValue(encryptedFile);
      service.findOne = jest.fn().mockResolvedValue(encryptedFile);

      const result = await service.uploadFile(fileBuffer, originalName, mimeType, uploaderId, encryptDto);

      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(crypto.createCipheriv).toHaveBeenCalledWith('aes-256-cbc', expect.any(Buffer), expect.any(Buffer));
      expect(result.isEncrypted).toBe(true);
    });

    it('should handle upload errors', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

      await expect(service.uploadFile(fileBuffer, originalName, mimeType, uploaderId, uploadDto))
        .rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated files', async () => {
      const files = [mockFile];
      mockFileRepository.findAndCount.mockResolvedValue([files, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.files).toEqual(files);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should apply search filter', async () => {
      const files = [mockFile];
      mockFileRepository.findAndCount.mockResolvedValue([files, 1]);

      await service.findAll({ search: 'test', page: 1, limit: 10 });

      expect(mockFileRepository.findAndCount).toHaveBeenCalled();
    });

    it('should filter by user access', async () => {
      const files = [mockFile];
      mockFileRepository.findAndCount.mockResolvedValue([files, 1]);

      await service.findAll({ page: 1, limit: 10 }, 1);

      expect(mockFileRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a file by id', async () => {
      mockFileRepository.findOne.mockResolvedValue(mockFile);

      const result = await service.findOne(1);

      expect(mockFileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['uploader'],
      });
      expect(result).toEqual(mockFile);
    });

    it('should throw NotFoundException if file not found', async () => {
      mockFileRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });

    it('should check user access permissions', async () => {
      const privateFile = { ...mockFile, visibility: FileVisibility.PRIVATE, uploaderId: 2 };
      mockFileRepository.findOne.mockResolvedValue(privateFile);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = {
      description: 'Updated description',
      category: 'updated-category',
    };

    it('should update a file successfully', async () => {
      service.findOne = jest.fn().mockResolvedValue(mockFile);
      const updatedFile = { ...mockFile, ...updateDto };
      mockFileRepository.update.mockResolvedValue({ affected: 1 });
      mockFileRepository.findOne.mockResolvedValue(updatedFile);

      const result = await service.update(1, updateDto);

      expect(service.findOne).toHaveBeenCalledWith(1, undefined);
      expect(mockFileRepository.update).toHaveBeenCalled();
      expect(result).toEqual(updatedFile);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      const otherUserFile = { ...mockFile, uploaderId: 2 };
      service.findOne = jest.fn().mockResolvedValue(otherUserFile);

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove a file successfully', async () => {
      service.findOne = jest.fn().mockResolvedValue(mockFile);
      mockFileRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(1);

      expect(service.findOne).toHaveBeenCalledWith(1, undefined);
      expect(fs.promises.unlink).toHaveBeenCalledWith(mockFile.filePath);
      expect(mockFileRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should handle file deletion errors gracefully', async () => {
      service.findOne = jest.fn().mockResolvedValue(mockFile);
      (fs.promises.unlink as jest.Mock).mockRejectedValue(new Error('Delete failed'));
      mockFileRepository.delete.mockResolvedValue({ affected: 1 });

      // Should not throw error even if file deletion fails
      await service.remove(1);

      expect(mockFileRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      const otherUserFile = { ...mockFile, uploaderId: 2 };
      service.findOne = jest.fn().mockResolvedValue(otherUserFile);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('downloadFile', () => {
    it('should prepare file for download', async () => {
      service.findOne = jest.fn().mockResolvedValue(mockFile);
      mockFileRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.downloadFile(1, 1);

      expect(service.findOne).toHaveBeenCalledWith(1, 1);
      expect(fs.promises.readFile).toHaveBeenCalledWith(mockFile.filePath);
      expect(mockFileRepository.update).toHaveBeenCalledWith(1, {
        downloadCount: 1,
        lastDownloaded: expect.any(Date),
      });
      expect(result.file).toEqual(mockFile);
      expect(result.content).toEqual(expect.any(Buffer));
    });

    it('should throw NotFoundException if file not found on disk', async () => {
      service.findOne = jest.fn().mockResolvedValue(mockFile);
      (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(service.downloadFile(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('should decrypt encrypted files', async () => {
      const encryptedFile = {
        ...mockFile,
        isEncrypted: true,
        encryptionKey: 'key123',
      };
      
      service.findOne = jest.fn().mockResolvedValue(encryptedFile);
      
      const mockDecipher = {
        update: jest.fn().mockReturnValue(Buffer.from('decrypted1')),
        final: jest.fn().mockReturnValue(Buffer.from('decrypted2')),
      };
      (crypto.createDecipheriv as jest.Mock) = jest.fn().mockReturnValue(mockDecipher);

      const result = await service.downloadFile(1, 1);

      expect(crypto.createDecipheriv).toHaveBeenCalled();
      expect(result.content).toBeDefined();
    });
  });

  describe('getStatistics', () => {
    it('should return file statistics', async () => {
      const files = [
        { ...mockFile, type: FileType.DOCUMENT, size: 1024 },
        { ...mockFile, id: 2, type: FileType.IMAGE, size: 2048 },
      ];
      mockFileRepository.find.mockResolvedValue(files);

      const result = await service.getStatistics();

      expect(result.totalFiles).toBe(2);
      expect(result.totalSize).toBe(3072);
      expect(result.byType).toHaveProperty(FileType.DOCUMENT);
      expect(result.byType).toHaveProperty(FileType.IMAGE);
    });
  });

  describe('shareFile', () => {
    const shareDto = {
      userIds: [1, 2],
      expiresAt: '2024-12-31',
      downloadLimit: 10,
    };

    it('should share a file successfully', async () => {
      service.findOne = jest.fn().mockResolvedValue(mockFile);
      const sharedFile = { 
        ...mockFile, 
        visibility: FileVisibility.SHARED,
        access: { allowedUsers: [1, 2], allowedRoles: ['USER'] },
      };
      mockFileRepository.update.mockResolvedValue({ affected: 1 });
      mockFileRepository.findOne.mockResolvedValue(sharedFile);

      const result = await service.shareFile(1, shareDto, 1);

      expect(mockFileRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        visibility: FileVisibility.SHARED,
      }));
      expect(result).toEqual(sharedFile);
    });
  });

  describe('bulkAction', () => {
    const bulkDto = {
      fileIds: [1, 2, 3],
      action: 'delete' as const,
    };

    it('should perform bulk delete action', async () => {
      const files = [mockFile, { ...mockFile, id: 2 }, { ...mockFile, id: 3 }];
      mockFileRepository.find.mockResolvedValue(files);
      mockFileRepository.delete.mockResolvedValue({ affected: 3 });

      const result = await service.bulkAction(bulkDto, 1);

      expect(mockFileRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything(), uploaderId: 1 },
      });
      expect(mockFileRepository.delete).toHaveBeenCalledWith([1, 2, 3]);
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures in bulk operations', async () => {
      const files = [mockFile];
      mockFileRepository.find.mockResolvedValue(files);
      mockFileRepository.delete.mockRejectedValue(new Error('Delete failed'));

      const result = await service.bulkAction(bulkDto, 1);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});