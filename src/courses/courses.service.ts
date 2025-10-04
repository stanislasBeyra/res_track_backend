import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindManyOptions, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Course, CourseStatus, CourseDifficulty } from './entities/course.entity';
import { CreateCourseDto, UpdateCourseDto, CourseFilterDto, CourseStatsDto } from './dto/course.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private usersService: UsersService,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    try {
      this.logger.log(`Création d'un nouveau cours: ${createCourseDto.title}`);

      const existingCourse = await this.courseRepository.findOne({
        where: { code: createCourseDto.code }
      });

      if (existingCourse) {
        throw new ConflictException(`Un cours avec le code "${createCourseDto.code}" existe déjà`);
      }

      const startDate = new Date(createCourseDto.startDate);
      const endDate = new Date(createCourseDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('La date de début doit être antérieure à la date de fin');
      }

      if (createCourseDto.instructor) {
        await this.usersService.findOne(createCourseDto.instructor);
      }

      const course = this.courseRepository.create({
        ...createCourseDto,
        startDate,
        endDate,
        enrolledStudents: 0,
      });

      const savedCourse = await this.courseRepository.save(course);
      this.logger.log(`Cours créé avec succès: ID ${savedCourse.id}`);

      return await this.findOne(savedCourse.id);
    } catch (error) {
      this.logger.error(`Erreur création cours: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(filterDto?: CourseFilterDto): Promise<{ courses: Course[], total: number, page: number, limit: number }> {
    try {
      this.logger.log('Récupération de la liste des cours');

      const page = filterDto?.page || 1;
      const limit = filterDto?.limit || 10;
      const skip = (page - 1) * limit;

      const query: FindManyOptions<Course> = {
        relations: ['instructorDetails'],
        skip,
        take: limit,
        order: {
          [filterDto?.sortBy || 'createdAt']: filterDto?.sortOrder || 'DESC',
        },
      };

      const where: any = {};

      if (filterDto?.search) {
        where.title = Like(`%${filterDto.search}%`);
      }

      if (filterDto?.status) {
        where.status = filterDto.status;
      }

      if (filterDto?.difficulty) {
        where.difficulty = filterDto.difficulty;
      }

      if (filterDto?.instructor) {
        where.instructor = filterDto.instructor;
      }

      if (filterDto?.startDateFrom || filterDto?.startDateTo) {
        where.startDate = {};
        if (filterDto.startDateFrom) {
          where.startDate = { ...where.startDate, ...MoreThanOrEqual(new Date(filterDto.startDateFrom)) };
        }
        if (filterDto.startDateTo) {
          where.startDate = { ...where.startDate, ...LessThanOrEqual(new Date(filterDto.startDateTo)) };
        }
      }

      if (filterDto?.priceMin !== undefined || filterDto?.priceMax !== undefined) {
        where.price = {};
        if (filterDto.priceMin !== undefined) {
          where.price = { ...where.price, ...MoreThanOrEqual(filterDto.priceMin) };
        }
        if (filterDto.priceMax !== undefined) {
          where.price = { ...where.price, ...LessThanOrEqual(filterDto.priceMax) };
        }
      }

      if (filterDto?.availableForEnrollment) {
        where.status = CourseStatus.ACTIVE;
      }

      query.where = where;

      const [courses, total] = await this.courseRepository.findAndCount(query);

      this.logger.log(`${courses.length} cours récupérés sur ${total} total`);

      return { courses, total, page, limit };
    } catch (error) {
      this.logger.error(`Erreur récupération cours: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<Course> {
    try {
      this.logger.log(`Recherche du cours ID: ${id}`);

      const course = await this.courseRepository.findOne({
        where: { id },
        relations: ['instructorDetails'],
      });

      if (!course) {
        throw new NotFoundException(`Cours avec l'ID ${id} non trouvé`);
      }

      return course;
    } catch (error) {
      this.logger.error(`Erreur recherche cours: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByCode(code: string): Promise<Course> {
    try {
      this.logger.log(`Recherche du cours par code: ${code}`);

      const course = await this.courseRepository.findOne({
        where: { code },
        relations: ['instructorDetails'],
      });

      if (!course) {
        throw new NotFoundException(`Cours avec le code "${code}" non trouvé`);
      }

      return course;
    } catch (error) {
      this.logger.error(`Erreur recherche cours par code: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateCourseDto: UpdateCourseDto): Promise<Course> {
    try {
      this.logger.log(`Mise à jour du cours ID: ${id}`);

      const course = await this.findOne(id);

      if (updateCourseDto.code && updateCourseDto.code !== course.code) {
        const existingCourse = await this.courseRepository.findOne({
          where: { code: updateCourseDto.code }
        });

        if (existingCourse) {
          throw new ConflictException(`Un cours avec le code "${updateCourseDto.code}" existe déjà`);
        }
      }

      if (updateCourseDto.startDate && updateCourseDto.endDate) {
        const startDate = new Date(updateCourseDto.startDate);
        const endDate = new Date(updateCourseDto.endDate);

        if (startDate >= endDate) {
          throw new BadRequestException('La date de début doit être antérieure à la date de fin');
        }
      }

      if (updateCourseDto.instructor) {
        await this.usersService.findOne(updateCourseDto.instructor);
      }

      const updatedData = { ...updateCourseDto };
      if (updateCourseDto.startDate) {
        (updatedData as any).startDate = new Date(updateCourseDto.startDate);
      }
      if (updateCourseDto.endDate) {
        (updatedData as any).endDate = new Date(updateCourseDto.endDate);
      }

      await this.courseRepository.update(id, updatedData);

      this.logger.log(`Cours ID ${id} mis à jour avec succès`);
      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`Erreur mise à jour cours: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      this.logger.log(`Suppression du cours ID: ${id}`);

      const course = await this.findOne(id);

      if (course.enrolledStudents > 0) {
        throw new BadRequestException('Impossible de supprimer un cours avec des étudiants inscrits');
      }

      await this.courseRepository.remove(course);
      this.logger.log(`Cours ID ${id} supprimé avec succès`);
    } catch (error) {
      this.logger.error(`Erreur suppression cours: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateStatus(id: number, status: CourseStatus): Promise<Course> {
    try {
      this.logger.log(`Mise à jour du statut du cours ID: ${id} vers ${status}`);

      const course = await this.findOne(id);

      if (status === CourseStatus.CANCELLED && course.enrolledStudents > 0) {
        this.logger.warn(`Annulation d'un cours avec ${course.enrolledStudents} étudiants inscrits`);
      }

      await this.courseRepository.update(id, { status });

      this.logger.log(`Statut du cours ID ${id} mis à jour vers ${status}`);
      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`Erreur mise à jour statut cours: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateEnrollmentCount(id: number, increment: number = 1): Promise<Course> {
    try {
      this.logger.log(`Mise à jour du nombre d'inscriptions pour le cours ID: ${id}`);

      const course = await this.findOne(id);

      const newCount = course.enrolledStudents + increment;

      if (newCount < 0) {
        throw new BadRequestException('Le nombre d\'étudiants inscrits ne peut pas être négatif');
      }

      if (newCount > course.maxStudents) {
        throw new BadRequestException('Le nombre maximum d\'étudiants est atteint');
      }

      await this.courseRepository.update(id, { enrolledStudents: newCount });

      this.logger.log(`Nombre d'inscriptions mis à jour: ${newCount} pour le cours ID ${id}`);
      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`Erreur mise à jour inscriptions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAvailableCourses(): Promise<Course[]> {
    try {
      this.logger.log('Récupération des cours disponibles pour inscription');

      const courses = await this.courseRepository.find({
        where: {
          status: CourseStatus.ACTIVE,
        },
        relations: ['instructorDetails'],
        order: { startDate: 'ASC' },
      });

      const availableCourses = courses.filter(course => 
        course.enrolledStudents < course.maxStudents &&
        new Date(course.startDate) > new Date()
      );

      this.logger.log(`${availableCourses.length} cours disponibles trouvés`);
      return availableCourses;
    } catch (error) {
      this.logger.error(`Erreur récupération cours disponibles: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStatistics(): Promise<CourseStatsDto> {
    try {
      this.logger.log('Génération des statistiques des cours');

      const courses = await this.courseRepository.find({
        relations: ['instructorDetails'],
      });

      const totalCourses = courses.length;
      const activeCourses = courses.filter(c => c.status === CourseStatus.ACTIVE).length;
      const completedCourses = courses.filter(c => c.status === CourseStatus.COMPLETED).length;
      const cancelledCourses = courses.filter(c => c.status === CourseStatus.CANCELLED).length;

      const totalCapacity = courses.reduce((sum, course) => sum + course.maxStudents, 0);
      const totalEnrolled = courses.reduce((sum, course) => sum + course.enrolledStudents, 0);
      const averageOccupancyRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 10000) / 100 : 0;

      const totalRevenue = courses
        .filter(c => c.price)
        .reduce((sum, course) => sum + (course.price * course.enrolledStudents), 0);

      const byDifficulty = courses.reduce((acc, course) => {
        acc[course.difficulty] = (acc[course.difficulty] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const instructorStats = courses.reduce((acc, course) => {
        if (course.instructor && course.instructorDetails) {
          const key = course.instructor;
          if (!acc[key]) {
            acc[key] = {
              instructorId: course.instructor,
              instructorName: `${course.instructorDetails.profile?.firstName || ''} ${course.instructorDetails.profile?.lastName || ''}`.trim(),
              courseCount: 0,
            };
          }
          acc[key].courseCount++;
        }
        return acc;
      }, {} as { [key: number]: any });

      const topInstructors = Object.values(instructorStats)
        .sort((a: any, b: any) => b.courseCount - a.courseCount)
        .slice(0, 10);

      return {
        totalCourses,
        activeCourses,
        completedCourses,
        cancelledCourses,
        averageOccupancyRate,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        byDifficulty,
        topInstructors,
      };
    } catch (error) {
      this.logger.error(`Erreur génération statistiques cours: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCoursesByInstructor(instructorId: number): Promise<Course[]> {
    try {
      this.logger.log(`Récupération des cours pour l'instructeur ID: ${instructorId}`);

      const courses = await this.courseRepository.find({
        where: { instructor: instructorId },
        relations: ['instructorDetails'],
        order: { startDate: 'ASC' },
      });

      this.logger.log(`${courses.length} cours trouvés pour l'instructeur ID ${instructorId}`);
      return courses;
    } catch (error) {
      this.logger.error(`Erreur récupération cours par instructeur: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUpcomingCourses(days: number = 7): Promise<Course[]> {
    try {
      this.logger.log(`Récupération des cours à venir dans les ${days} prochains jours`);

      const today = new Date();
      const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

      const courses = await this.courseRepository.find({
        where: {
          status: CourseStatus.ACTIVE,
          startDate: Between(today, futureDate),
        },
        relations: ['instructorDetails'],
        order: { startDate: 'ASC' },
      });

      this.logger.log(`${courses.length} cours à venir trouvés`);
      return courses;
    } catch (error) {
      this.logger.error(`Erreur récupération cours à venir: ${error.message}`, error.stack);
      throw error;
    }
  }

  async searchCourses(query: string): Promise<Course[]> {
    try {
      this.logger.log(`Recherche de cours: "${query}"`);

      const courses = await this.courseRepository.find({
        where: [
          { title: Like(`%${query}%`) },
          { code: Like(`%${query}%`) },
          { description: Like(`%${query}%`) },
        ],
        relations: ['instructorDetails'],
        order: { title: 'ASC' },
      });

      this.logger.log(`${courses.length} cours trouvés pour la recherche "${query}"`);
      return courses;
    } catch (error) {
      this.logger.error(`Erreur recherche cours: ${error.message}`, error.stack);
      throw error;
    }
  }

  async duplicateCourse(id: number, newCode: string, newTitle?: string): Promise<Course> {
    try {
      this.logger.log(`Duplication du cours ID: ${id}`);

      const originalCourse = await this.findOne(id);

      const existingCourse = await this.courseRepository.findOne({
        where: { code: newCode }
      });

      if (existingCourse) {
        throw new ConflictException(`Un cours avec le code "${newCode}" existe déjà`);
      }

      const { id: _, createdAt, updatedAt, enrolledStudents, ...courseData } = originalCourse;

      const duplicatedCourse = this.courseRepository.create({
        ...courseData,
        code: newCode,
        title: newTitle || `${originalCourse.title} (Copie)`,
        enrolledStudents: 0,
        status: CourseStatus.INACTIVE,
      });

      const savedCourse = await this.courseRepository.save(duplicatedCourse);
      this.logger.log(`Cours dupliqué avec succès: ID ${savedCourse.id}`);

      return await this.findOne(savedCourse.id);
    } catch (error) {
      this.logger.error(`Erreur duplication cours: ${error.message}`, error.stack);
      throw error;
    }
  }
}