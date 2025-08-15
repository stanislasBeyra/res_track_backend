import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { Alert } from './entities/alert.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('AlertsService', () => {
  let service: AlertsService;

  const mockAlertsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockStudentsRepository = {
    findOne: jest.fn(),
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
  };

  const mockNotificationsService = {
    createAlertNotification: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(Alert),
          useValue: mockAlertsRepository,
        },
        {
          provide: getRepositoryToken(Student),
          useValue: mockStudentsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});