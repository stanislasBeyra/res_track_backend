import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { Course, CourseStatus, CourseDifficulty } from './entities/course.entity';
import { UsersService } from '../users/users.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let courseRepository: Repository<Course>;
  let usersService: UsersService;

  const mockCourseRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockCourse = {
    id: 1,
    title: 'Test Course',
    code: 'TEST-001',
    description: 'Test course description',
    status: CourseStatus.ACTIVE,
    difficulty: CourseDifficulty.BEGINNER,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-01'),
    maxStudents: 30,
    enrolledStudents: 0,
    instructor: 1,
    instructorDetails: {
      id: 1,
      username: 'instructor',
      profile: { firstName: 'John', lastName: 'Doe' }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getRepositoryToken(Course),
          useValue: mockCourseRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    courseRepository = module.get<Repository<Course>>(getRepositoryToken(Course));
    usersService = module.get<UsersService>(UsersService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createCourseDto = {
      title: 'New Course',
      code: 'NEW-001',
      description: 'New course description',
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      maxStudents: 25,
      instructor: 1,
    };

    it('should create a new course successfully', async () => {
      mockCourseRepository.findOne.mockResolvedValue(null); // No existing course
      mockUsersService.findOne.mockResolvedValue({ id: 1 }); // Valid instructor
      mockCourseRepository.create.mockReturnValue(mockCourse);
      mockCourseRepository.save.mockResolvedValue(mockCourse);
      service.findOne = jest.fn().mockResolvedValue(mockCourse);

      const result = await service.create(createCourseDto);

      expect(mockCourseRepository.findOne).toHaveBeenCalledWith({
        where: { code: createCourseDto.code }
      });
      expect(mockUsersService.findOne).toHaveBeenCalledWith(createCourseDto.instructor);
      expect(mockCourseRepository.create).toHaveBeenCalled();
      expect(mockCourseRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockCourse);
    });

    it('should throw ConflictException if course code already exists', async () => {
      mockCourseRepository.findOne.mockResolvedValue(mockCourse);

      await expect(service.create(createCourseDto)).rejects.toThrow(ConflictException);
      expect(mockCourseRepository.findOne).toHaveBeenCalledWith({
        where: { code: createCourseDto.code }
      });
    });

    it('should throw BadRequestException if start date is after end date', async () => {
      const invalidDto = {
        ...createCourseDto,
        startDate: '2024-06-01',
        endDate: '2024-01-01',
      };
      mockCourseRepository.findOne.mockResolvedValue(null);

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a course by id', async () => {
      mockCourseRepository.findOne.mockResolvedValue(mockCourse);

      const result = await service.findOne(1);

      expect(mockCourseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['instructorDetails'],
      });
      expect(result).toEqual(mockCourse);
    });

    it('should throw NotFoundException if course not found', async () => {
      mockCourseRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated courses', async () => {
      const courses = [mockCourse];
      mockCourseRepository.findAndCount.mockResolvedValue([courses, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.courses).toEqual(courses);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should apply search filter', async () => {
      const courses = [mockCourse];
      mockCourseRepository.findAndCount.mockResolvedValue([courses, 1]);

      await service.findAll({ search: 'Test', page: 1, limit: 10 });

      expect(mockCourseRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateCourseDto = {
      title: 'Updated Course',
      description: 'Updated description',
    };

    it('should update a course successfully', async () => {
      service.findOne = jest.fn()
        .mockResolvedValueOnce(mockCourse) // First call for validation
        .mockResolvedValueOnce({ ...mockCourse, ...updateCourseDto }); // Second call for result
      mockCourseRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update(1, updateCourseDto);

      expect(service.findOne).toHaveBeenCalledTimes(2);
      expect(mockCourseRepository.update).toHaveBeenCalledWith(1, updateCourseDto);
      expect(result.title).toBe(updateCourseDto.title);
    });
  });

  describe('remove', () => {
    it('should remove a course successfully', async () => {
      const courseToRemove = { ...mockCourse, enrolledStudents: 0 };
      service.findOne = jest.fn().mockResolvedValue(courseToRemove);
      mockCourseRepository.remove.mockResolvedValue(courseToRemove);

      await service.remove(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(mockCourseRepository.remove).toHaveBeenCalledWith(courseToRemove);
    });

    it('should throw BadRequestException if course has enrolled students', async () => {
      const courseWithStudents = { ...mockCourse, enrolledStudents: 5 };
      service.findOne = jest.fn().mockResolvedValue(courseWithStudents);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should update course status', async () => {
      service.findOne = jest.fn()
        .mockResolvedValueOnce(mockCourse)
        .mockResolvedValueOnce({ ...mockCourse, status: CourseStatus.CANCELLED });
      mockCourseRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateStatus(1, CourseStatus.CANCELLED);

      expect(mockCourseRepository.update).toHaveBeenCalledWith(1, { status: CourseStatus.CANCELLED });
      expect(result.status).toBe(CourseStatus.CANCELLED);
    });
  });

  describe('getAvailableCourses', () => {
    it('should return available courses for enrollment', async () => {
      // Create a future course that is available
      const futureCourse = {
        ...mockCourse,
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        enrolledStudents: 10,
        maxStudents: 30
      };
      
      mockCourseRepository.find.mockResolvedValue([futureCourse]);

      const result = await service.getAvailableCourses();

      expect(mockCourseRepository.find).toHaveBeenCalledWith({
        where: {
          status: CourseStatus.ACTIVE,
        },
        relations: ['instructorDetails'],
        order: { startDate: 'ASC' },
      });
      expect(result).toEqual([futureCourse]);
    });
  });

  describe('updateEnrollmentCount', () => {
    it('should increment enrollment count', async () => {
      service.findOne = jest.fn()
        .mockResolvedValueOnce(mockCourse)
        .mockResolvedValueOnce({ ...mockCourse, enrolledStudents: 1 });
      mockCourseRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateEnrollmentCount(1, 1);

      expect(mockCourseRepository.update).toHaveBeenCalledWith(1, { enrolledStudents: 1 });
      expect(result.enrolledStudents).toBe(1);
    });

    it('should throw BadRequestException if enrollment would be negative', async () => {
      service.findOne = jest.fn().mockResolvedValue(mockCourse);

      await expect(service.updateEnrollmentCount(1, -5)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if enrollment exceeds maximum', async () => {
      const fullCourse = { ...mockCourse, enrolledStudents: 29, maxStudents: 30 };
      service.findOne = jest.fn().mockResolvedValue(fullCourse);

      await expect(service.updateEnrollmentCount(1, 2)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByCode', () => {
    it('should return a course by code', async () => {
      mockCourseRepository.findOne.mockResolvedValue(mockCourse);

      const result = await service.findByCode('TEST-001');

      expect(mockCourseRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'TEST-001' },
        relations: ['instructorDetails'],
      });
      expect(result).toEqual(mockCourse);
    });

    it('should throw NotFoundException if course not found by code', async () => {
      mockCourseRepository.findOne.mockResolvedValue(null);

      await expect(service.findByCode('NOTFOUND')).rejects.toThrow(NotFoundException);
    });
  });
});