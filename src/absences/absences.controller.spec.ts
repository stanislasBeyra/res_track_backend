import { Test, TestingModule } from '@nestjs/testing';
import { AbsencesController } from './absences.controller';
import { AbsencesService } from './absences.service';

describe('AbsencesController', () => {
  let controller: AbsencesController;

  const mockAbsencesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByStudentId: jest.fn(),
    findByDateRange: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AbsencesController],
      providers: [
        {
          provide: AbsencesService,
          useValue: mockAbsencesService,
        },
      ],
    }).compile();

    controller = module.get<AbsencesController>(AbsencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
