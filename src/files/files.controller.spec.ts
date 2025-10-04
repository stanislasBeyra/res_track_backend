import { Test, TestingModule } from '@nestjs/testing';
import { FilesController, FileApiResponse } from './files.controller';
import { FilesService } from './files.service';
import { File, FileType, FileStatus, FileVisibility } from './entities/file.entity';
import { UploadFileDto, UpdateFileDto, ShareFileDto, BulkActionDto } from './dto/file.dto';

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: FilesService;

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

  const mockFilesService = {
    uploadFile: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    downloadFile: jest.fn(),
    shareFile: jest.fn(),
    bulkAction: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    filesService = module.get<FilesService>(FilesService);

    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const uploadDto: UploadFileDto = {
        description: 'Test file',
        category: 'documents',
        tags: ['test'],
        visibility: FileVisibility.PRIVATE,
      };
      
      const mockFileData = {
        originalname: 'test-file.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test content'),
      };

      const mockReq = { user: { id: 1 } };

      mockFilesService.uploadFile.mockResolvedValue(mockFile);

      const result = await controller.uploadFile(mockFileData, uploadDto, mockReq);

      expect(mockFilesService.uploadFile).toHaveBeenCalledWith(
        mockFileData.buffer,
        mockFileData.originalname,
        mockFileData.mimetype,
        1,
        uploadDto
      );
      expect(result).toBeInstanceOf(FileApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFile);
    });

    it('should handle missing file', async () => {
      const uploadDto: UploadFileDto = {
        description: 'Test file',
      };
      const mockReq = { user: { id: 1 } };

      await expect(controller.uploadFile(null, uploadDto, mockReq)).rejects.toThrow();
    });

    it('should handle upload errors', async () => {
      const uploadDto: UploadFileDto = {
        description: 'Test file',
      };
      
      const mockFileData = {
        originalname: 'test-file.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('test content'),
      };

      const mockReq = { user: { id: 1 } };
      const error = new Error('Upload failed');
      mockFilesService.uploadFile.mockRejectedValue(error);

      await expect(controller.uploadFile(mockFileData, uploadDto, mockReq)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return paginated files', async () => {
      const mockResult = {
        files: [mockFile],
        total: 1,
        page: 1,
        limit: 10
      };

      const mockReq = { user: { id: 1 } };
      mockFilesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll({}, mockReq);

      expect(mockFilesService.findAll).toHaveBeenCalledWith({}, 1);
      expect(result).toBeInstanceOf(FileApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.files);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1
      });
    });

    it('should handle public access when no user', async () => {
      const mockResult = {
        files: [mockFile],
        total: 1,
        page: 1,
        limit: 10
      };

      mockFilesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll({}, {});

      expect(mockFilesService.findAll).toHaveBeenCalledWith({}, undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a specific file', async () => {
      const mockReq = { user: { id: 1 } };
      mockFilesService.findOne.mockResolvedValue(mockFile);

      const result = await controller.findOne(1, mockReq);

      expect(mockFilesService.findOne).toHaveBeenCalledWith(1, 1);
      expect(result).toBeInstanceOf(FileApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFile);
    });

    it('should handle unauthorized access', async () => {
      const error = new Error('Unauthorized');
      mockFilesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(1, {})).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a file successfully', async () => {
      const updateDto: UpdateFileDto = {
        description: 'Updated description',
        category: 'updated-category',
      };

      const updatedFile = { ...mockFile, ...updateDto };
      const mockReq = { user: { id: 1 } };
      mockFilesService.update.mockResolvedValue(updatedFile);

      const result = await controller.update(1, updateDto, mockReq);

      expect(mockFilesService.update).toHaveBeenCalledWith(1, updateDto, 1);
      expect(result).toBeInstanceOf(FileApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedFile);
    });
  });

  describe('remove', () => {
    it('should remove a file successfully', async () => {
      const mockReq = { user: { id: 1 } };
      mockFilesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1, false, mockReq);

      expect(mockFilesService.remove).toHaveBeenCalledWith(1, 1, false);
      expect(result).toBeInstanceOf(FileApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });
  });

  describe('downloadFile', () => {
    it('should prepare file for download', async () => {
      const mockDownloadData = {
        file: mockFile,
        content: Buffer.from('test content'),
      };

      const mockReq = { user: { id: 1 } };
      const mockRes = {
        set: jest.fn(),
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockFilesService.downloadFile.mockResolvedValue(mockDownloadData);

      await controller.downloadFile(1, mockReq, mockRes as any);

      expect(mockFilesService.downloadFile).toHaveBeenCalledWith(1, 1);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', mockFile.mimeType);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', `attachment; filename="${mockFile.originalName}"`);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Length', mockDownloadData.content.length);
      expect(mockRes.send).toHaveBeenCalledWith(mockDownloadData.content);
    });
  });

  describe('shareFile', () => {
    it('should share a file successfully', async () => {
      const shareDto: ShareFileDto = {
        userIds: [1, 2],
        expiresAt: '2024-12-31',
        downloadLimit: 10,
      };

      const sharedFile = { ...mockFile, visibility: FileVisibility.SHARED };
      const mockReq = { user: { id: 1 } };
      mockFilesService.shareFile.mockResolvedValue(sharedFile);

      const result = await controller.shareFile(1, shareDto, mockReq);

      expect(mockFilesService.shareFile).toHaveBeenCalledWith(1, shareDto, 1);
      expect(result).toBeInstanceOf(FileApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(sharedFile);
    });
  });

  describe('bulkAction', () => {
    it('should perform bulk action successfully', async () => {
      const bulkDto: BulkActionDto = {
        fileIds: [1, 2, 3],
        action: 'delete',
      };

      const mockResult = {
        success: 3,
        failed: 0,
        errors: [],
      };

      const mockReq = { user: { id: 1 } };
      mockFilesService.bulkAction.mockResolvedValue(mockResult);

      const result = await controller.bulkAction(bulkDto, mockReq);

      expect(mockFilesService.bulkAction).toHaveBeenCalledWith(bulkDto, 1);
      expect(result).toBeInstanceOf(FileApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('getStatistics', () => {
    it('should return file statistics', async () => {
      const mockStats = {
        totalFiles: 10,
        totalSize: 10240,
        byType: {
          [FileType.DOCUMENT]: 5,
          [FileType.IMAGE]: 3,
          [FileType.OTHER]: 2,
        },
        byStatus: {
          [FileStatus.ACTIVE]: 8,
          [FileStatus.ARCHIVED]: 2,
        },
        uploadTrend: [],
        topUploaders: [],
      };

      mockFilesService.getStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics();

      expect(mockFilesService.getStatistics).toHaveBeenCalled();
      expect(result).toBeInstanceOf(FileApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });
  });

});