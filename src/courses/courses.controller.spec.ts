import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController, CourseApiResponse } from './courses.controller';
import { CoursesService } from './courses.service';
import { Course, CourseStatus, CourseDifficulty } from './entities/course.entity';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';

describe('CoursesController', () => {
  let controller: CoursesController;
  let coursesService: CoursesService;

  const mockCourse: Course = {
    id: 1,
    title: 'Test Course',
    code: 'TEST-001',
    description: 'Test course description',
    status: CourseStatus.ACTIVE,
    difficulty: CourseDifficulty.BEGINNER,
    credits: 3,
    maxStudents: 30,
    enrolledStudents: 0,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-01'),
    startTime: '09:00',
    endTime: '12:00',
    schedule: [],
    room: 'A101',
    price: 500,
    prerequisites: [],
    objectives: [],
    materials: [],
    syllabus: 'Course syllabus',
    instructor: 1,
    instructorDetails: {
      id: 1,
      username: 'instructor',
      email: 'instructor@test.com',
      role: 'TEACHER',
      isActive: true,
      profile: { firstName: 'John', lastName: 'Doe' },
      createdAt: new Date(),
      updatedAt: new Date()
    } as any,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    absences: []
  };

  const mockCoursesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCode: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStatus: jest.fn(),
    getAvailableCourses: jest.fn(),
    getStatistics: jest.fn(),
    getUpcomingCourses: jest.fn(),
    searchCourses: jest.fn(),
    getCoursesByInstructor: jest.fn(),
    duplicateCourse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        {
          provide: CoursesService,
          useValue: mockCoursesService,
        },
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
    coursesService = module.get<CoursesService>(CoursesService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a course successfully', async () => {
      const createCourseDto: CreateCourseDto = {
        title: 'New Course',
        code: 'NEW-001',
        description: 'New course description',
        startDate: '2024-01-01',
        endDate: '2024-06-01',
        maxStudents: 25,
        instructor: 1
      };

      mockCoursesService.create.mockResolvedValue(mockCourse);

      const result = await controller.create(createCourseDto);

      expect(mockCoursesService.create).toHaveBeenCalledWith(createCourseDto);
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCourse);
      expect(result.message).toBe('Cours créé avec succès');
    });

    it('should handle creation errors', async () => {
      const createCourseDto: CreateCourseDto = {
        title: 'New Course',
        code: 'NEW-001',
        description: 'New course description',
        startDate: '2024-01-01',
        endDate: '2024-06-01',
        maxStudents: 25,
        instructor: 1
      };

      const error = new Error('Creation failed');
      mockCoursesService.create.mockRejectedValue(error);

      await expect(controller.create(createCourseDto)).rejects.toThrow();
      expect(mockCoursesService.create).toHaveBeenCalledWith(createCourseDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated courses', async () => {
      const mockResult = {
        courses: [mockCourse],
        total: 1,
        page: 1,
        limit: 10
      };

      mockCoursesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll({});

      expect(mockCoursesService.findAll).toHaveBeenCalledWith({});
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.courses);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1
      });
    });
  });

  describe('findOne', () => {
    it('should return a specific course', async () => {
      mockCoursesService.findOne.mockResolvedValue(mockCourse);

      const result = await controller.findOne(1);

      expect(mockCoursesService.findOne).toHaveBeenCalledWith(1);
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCourse);
    });
  });

  describe('findByCode', () => {
    it('should return a course by code', async () => {
      mockCoursesService.findByCode.mockResolvedValue(mockCourse);

      const result = await controller.findByCode('TEST-001');

      expect(mockCoursesService.findByCode).toHaveBeenCalledWith('TEST-001');
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCourse);
    });
  });

  describe('update', () => {
    it('should update a course successfully', async () => {
      const updateCourseDto: UpdateCourseDto = {
        title: 'Updated Course',
        description: 'Updated description'
      };

      const updatedCourse = { ...mockCourse, ...updateCourseDto };
      mockCoursesService.update.mockResolvedValue(updatedCourse);

      const result = await controller.update(1, updateCourseDto);

      expect(mockCoursesService.update).toHaveBeenCalledWith(1, updateCourseDto);
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedCourse);
    });
  });

  describe('updateStatus', () => {
    it('should update course status', async () => {
      const updatedCourse = { ...mockCourse, status: CourseStatus.CANCELLED };
      mockCoursesService.updateStatus.mockResolvedValue(updatedCourse);

      const result = await controller.updateStatus(1, CourseStatus.CANCELLED);

      expect(mockCoursesService.updateStatus).toHaveBeenCalledWith(1, CourseStatus.CANCELLED);
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedCourse);
    });
  });

  describe('findAvailable', () => {
    it('should return available courses', async () => {
      mockCoursesService.getAvailableCourses.mockResolvedValue([mockCourse]);

      const result = await controller.findAvailable();

      expect(mockCoursesService.getAvailableCourses).toHaveBeenCalled();
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockCourse]);
    });
  });

  describe('getUpcoming', () => {
    it('should return upcoming courses', async () => {
      mockCoursesService.getUpcomingCourses.mockResolvedValue([mockCourse]);

      const result = await controller.getUpcoming(7);

      expect(mockCoursesService.getUpcomingCourses).toHaveBeenCalledWith(7);
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockCourse]);
    });
  });

  describe('search', () => {
    it('should search courses successfully', async () => {
      mockCoursesService.searchCourses.mockResolvedValue([mockCourse]);

      const result = await controller.search('test');

      expect(mockCoursesService.searchCourses).toHaveBeenCalledWith('test');
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockCourse]);
    });

    it('should handle invalid search query', async () => {
      await expect(controller.search('a')).rejects.toThrow();
    });
  });

  describe('findByInstructor', () => {
    it('should return courses by instructor', async () => {
      mockCoursesService.getCoursesByInstructor.mockResolvedValue([mockCourse]);

      const result = await controller.findByInstructor(1);

      expect(mockCoursesService.getCoursesByInstructor).toHaveBeenCalledWith(1);
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockCourse]);
    });
  });

  describe('duplicate', () => {
    it('should duplicate a course successfully', async () => {
      const duplicatedCourse = { ...mockCourse, id: 2, code: 'TEST-002' };
      mockCoursesService.duplicateCourse.mockResolvedValue(duplicatedCourse);

      const result = await controller.duplicate(1, { newCode: 'TEST-002' });

      expect(mockCoursesService.duplicateCourse).toHaveBeenCalledWith(1, 'TEST-002', undefined);
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(duplicatedCourse);
    });

    it('should handle missing newCode', async () => {
      await expect(controller.duplicate(1, { newCode: '' })).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove a course successfully', async () => {
      mockCoursesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(mockCoursesService.remove).toHaveBeenCalledWith(1);
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });
  });

  describe('getStatistics', () => {
    it('should return course statistics', async () => {
      const mockStats = {
        totalCourses: 5,
        activeCourses: 3,
        completedCourses: 1,
        cancelledCourses: 1,
        averageOccupancyRate: 75.5,
        totalRevenue: 15000,
        byDifficulty: { BEGINNER: 2, INTERMEDIATE: 2, ADVANCED: 1 },
        topInstructors: []
      };

      mockCoursesService.getStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics();

      expect(mockCoursesService.getStatistics).toHaveBeenCalled();
      expect(result).toBeInstanceOf(CourseApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });
  });
});