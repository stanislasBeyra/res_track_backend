import { Test, TestingModule } from '@nestjs/testing';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { AlertType } from './entities/alert.entity';

describe('AlertsController', () => {
  let controller: AlertsController;
  let service: AlertsService;

  const mockAlertsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    resolve: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    controller = module.get<AlertsController>(AlertsController);
    service = module.get<AlertsService>(AlertsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an alert', async () => {
      const createAlertDto: CreateAlertDto = {
        studentId: 1,
        type: AlertType.LATE,
        message: 'Test alert'
      };

      const expectedResult = {
        id: 1,
        ...createAlertDto,
        createdAt: new Date(),
        resolved: false
      };

      mockAlertsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createAlertDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedResult);
      expect(mockAlertsService.create).toHaveBeenCalledWith(createAlertDto);
    });
  });

  describe('findAll', () => {
    it('should return all alerts', async () => {
      const expectedAlerts = [
        { id: 1, studentId: 1, type: AlertType.LATE, description: 'Test' }
      ];

      mockAlertsService.findAll.mockResolvedValue(expectedAlerts);

      const result = await controller.findAll();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedAlerts);
    });
  });
});
