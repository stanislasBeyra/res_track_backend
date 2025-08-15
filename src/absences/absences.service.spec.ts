import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AbsencesService } from './absences.service';
import { Absence } from './entities/absence.entity';
import { Student } from '../students/entities/student.entity';

describe('AbsencesService', () => {
  let service: AbsencesService;

  const mockAbsencesRepository = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbsencesService,
        {
          provide: getRepositoryToken(Absence),
          useValue: mockAbsencesRepository,
        },
        {
          provide: getRepositoryToken(Student),
          useValue: mockStudentsRepository,
        },
      ],
    }).compile();

    service = module.get<AbsencesService>(AbsencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
