import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindManyOptions, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Schedule, ScheduleStatus, ScheduleType, RecurrenceType } from './entities/schedule.entity';
import { CreateScheduleDto, UpdateScheduleDto, ScheduleFilterDto, AttendanceDto, BulkAttendanceDto, ScheduleStatsDto } from './dto/schedule.dto';
import { CoursesService } from '../courses/courses.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    private coursesService: CoursesService,
    private usersService: UsersService,
  ) {}

  async create(createScheduleDto: CreateScheduleDto): Promise<Schedule> {
    try {
      this.logger.log(`Création d'une nouvelle session: ${createScheduleDto.title}`);

      await this.coursesService.findOne(createScheduleDto.courseId);

      if (createScheduleDto.instructorId) {
        await this.usersService.findOne(createScheduleDto.instructorId);
      }

      const scheduleDate = new Date(createScheduleDto.date);
      const startTime = createScheduleDto.startTime;
      const endTime = createScheduleDto.endTime;

      if (startTime >= endTime) {
        throw new BadRequestException('L\'heure de début doit être antérieure à l\'heure de fin');
      }

      const conflictingSchedule = await this.checkForConflicts(
        createScheduleDto.courseId,
        createScheduleDto.instructorId,
        scheduleDate,
        startTime,
        endTime,
        createScheduleDto.room
      );

      if (conflictingSchedule) {
        throw new ConflictException('Un conflit d\'horaire a été détecté avec une session existante');
      }

      const schedule = this.scheduleRepository.create({
        ...createScheduleDto,
        date: scheduleDate,
        attendees: 0,
        attendance: [],
      });

      const savedSchedule = await this.scheduleRepository.save(schedule);
      this.logger.log(`Session créée avec succès: ID ${savedSchedule.id}`);

      if (createScheduleDto.recurrenceType && createScheduleDto.recurrenceType !== RecurrenceType.NONE) {
        await this.createRecurringSchedules(savedSchedule, createScheduleDto);
      }

      return await this.findOne(savedSchedule.id);
    } catch (error) {
      this.logger.error(`Erreur création session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(filterDto?: ScheduleFilterDto): Promise<{ schedules: Schedule[], total: number, page: number, limit: number }> {
    try {
      this.logger.log('Récupération de la liste des sessions');

      const page = filterDto?.page || 1;
      const limit = filterDto?.limit || 20;
      const skip = (page - 1) * limit;

      const query: FindManyOptions<Schedule> = {
        relations: ['course', 'instructor'],
        skip,
        take: limit,
        order: {
          [filterDto?.sortBy || 'date']: filterDto?.sortOrder || 'ASC',
          startTime: 'ASC',
        },
      };

      const where: any = {};

      if (filterDto?.search) {
        where.title = Like(`%${filterDto.search}%`);
      }

      if (filterDto?.courseId) {
        where.courseId = filterDto.courseId;
      }

      if (filterDto?.instructorId) {
        where.instructorId = filterDto.instructorId;
      }

      if (filterDto?.status) {
        where.status = filterDto.status;
      }

      if (filterDto?.type) {
        where.type = filterDto.type;
      }

      if (filterDto?.dateFrom || filterDto?.dateTo) {
        where.date = {};
        if (filterDto.dateFrom) {
          where.date = { ...where.date, ...MoreThanOrEqual(new Date(filterDto.dateFrom)) };
        }
        if (filterDto.dateTo) {
          where.date = { ...where.date, ...LessThanOrEqual(new Date(filterDto.dateTo)) };
        }
      }

      if (filterDto?.onlineOnly) {
        where.isOnline = true;
      }

      query.where = where;

      const [schedules, total] = await this.scheduleRepository.findAndCount(query);

      let filteredSchedules = schedules;

      if (filterDto?.availableOnly) {
        filteredSchedules = schedules.filter(schedule => 
          !schedule.capacity || schedule.attendees < schedule.capacity
        );
      }

      this.logger.log(`${filteredSchedules.length} sessions récupérées sur ${total} total`);

      return { schedules: filteredSchedules, total, page, limit };
    } catch (error) {
      this.logger.error(`Erreur récupération sessions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<Schedule> {
    try {
      this.logger.log(`Recherche de la session ID: ${id}`);

      const schedule = await this.scheduleRepository.findOne({
        where: { id },
        relations: ['course', 'instructor'],
      });

      if (!schedule) {
        throw new NotFoundException(`Session avec l'ID ${id} non trouvée`);
      }

      return schedule;
    } catch (error) {
      this.logger.error(`Erreur recherche session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateScheduleDto: UpdateScheduleDto): Promise<Schedule> {
    try {
      this.logger.log(`Mise à jour de la session ID: ${id}`);

      const schedule = await this.findOne(id);

      if (updateScheduleDto.courseId && updateScheduleDto.courseId !== schedule.courseId) {
        await this.coursesService.findOne(updateScheduleDto.courseId);
      }

      if (updateScheduleDto.instructorId && updateScheduleDto.instructorId !== schedule.instructorId) {
        await this.usersService.findOne(updateScheduleDto.instructorId);
      }

      if (updateScheduleDto.startTime && updateScheduleDto.endTime) {
        if (updateScheduleDto.startTime >= updateScheduleDto.endTime) {
          throw new BadRequestException('L\'heure de début doit être antérieure à l\'heure de fin');
        }
      }

      const updatedData = { ...updateScheduleDto };
      if (updateScheduleDto.date) {
        (updatedData as any).date = new Date(updateScheduleDto.date);
      }

      await this.scheduleRepository.update(id, updatedData);

      this.logger.log(`Session ID ${id} mise à jour avec succès`);
      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`Erreur mise à jour session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      this.logger.log(`Suppression de la session ID: ${id}`);

      const schedule = await this.findOne(id);

      if (schedule.attendees > 0) {
        this.logger.warn(`Suppression d'une session avec ${schedule.attendees} participants`);
      }

      await this.scheduleRepository.remove(schedule);
      this.logger.log(`Session ID ${id} supprimée avec succès`);
    } catch (error) {
      this.logger.error(`Erreur suppression session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateStatus(id: number, status: ScheduleStatus): Promise<Schedule> {
    try {
      this.logger.log(`Mise à jour du statut de la session ID: ${id} vers ${status}`);

      const schedule = await this.findOne(id);

      await this.scheduleRepository.update(id, { status });

      this.logger.log(`Statut de la session ID ${id} mis à jour vers ${status}`);
      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`Erreur mise à jour statut session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateAttendance(id: number, attendanceData: BulkAttendanceDto): Promise<Schedule> {
    try {
      this.logger.log(`Mise à jour des présences pour la session ID: ${id}`);

      const schedule = await this.findOne(id);

      const updatedAttendance = attendanceData.attendance;
      const attendeeCount = updatedAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;

      await this.scheduleRepository.update(id, {
        attendance: updatedAttendance,
        attendees: attendeeCount,
      });

      this.logger.log(`Présences mises à jour pour la session ID ${id}: ${attendeeCount} participants`);
      return await this.findOne(id);
    } catch (error) {
      this.logger.error(`Erreur mise à jour présences: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSchedulesByCourse(courseId: number, dateFrom?: string, dateTo?: string): Promise<Schedule[]> {
    try {
      this.logger.log(`Récupération des sessions pour le cours ID: ${courseId}`);

      const where: any = { courseId };

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) {
          where.date = { ...where.date, ...MoreThanOrEqual(new Date(dateFrom)) };
        }
        if (dateTo) {
          where.date = { ...where.date, ...LessThanOrEqual(new Date(dateTo)) };
        }
      }

      const schedules = await this.scheduleRepository.find({
        where,
        relations: ['course', 'instructor'],
        order: { date: 'ASC', startTime: 'ASC' },
      });

      this.logger.log(`${schedules.length} sessions trouvées pour le cours ID ${courseId}`);
      return schedules;
    } catch (error) {
      this.logger.error(`Erreur récupération sessions par cours: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSchedulesByInstructor(instructorId: number, dateFrom?: string, dateTo?: string): Promise<Schedule[]> {
    try {
      this.logger.log(`Récupération des sessions pour l'instructeur ID: ${instructorId}`);

      const where: any = { instructorId };

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) {
          where.date = { ...where.date, ...MoreThanOrEqual(new Date(dateFrom)) };
        }
        if (dateTo) {
          where.date = { ...where.date, ...LessThanOrEqual(new Date(dateTo)) };
        }
      }

      const schedules = await this.scheduleRepository.find({
        where,
        relations: ['course', 'instructor'],
        order: { date: 'ASC', startTime: 'ASC' },
      });

      this.logger.log(`${schedules.length} sessions trouvées pour l'instructeur ID ${instructorId}`);
      return schedules;
    } catch (error) {
      this.logger.error(`Erreur récupération sessions par instructeur: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTodaySchedules(): Promise<Schedule[]> {
    try {
      this.logger.log('Récupération des sessions d\'aujourd\'hui');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const schedules = await this.scheduleRepository.find({
        where: {
          date: Between(today, tomorrow),
          status: ScheduleStatus.ACTIVE,
        },
        relations: ['course', 'instructor'],
        order: { startTime: 'ASC' },
      });

      this.logger.log(`${schedules.length} sessions trouvées pour aujourd'hui`);
      return schedules;
    } catch (error) {
      this.logger.error(`Erreur récupération sessions du jour: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUpcomingSchedules(days: number = 7): Promise<Schedule[]> {
    try {
      this.logger.log(`Récupération des sessions à venir dans les ${days} prochains jours`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);

      const schedules = await this.scheduleRepository.find({
        where: {
          date: Between(today, futureDate),
          status: ScheduleStatus.ACTIVE,
        },
        relations: ['course', 'instructor'],
        order: { date: 'ASC', startTime: 'ASC' },
      });

      this.logger.log(`${schedules.length} sessions à venir trouvées`);
      return schedules;
    } catch (error) {
      this.logger.error(`Erreur récupération sessions à venir: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStatistics(): Promise<ScheduleStatsDto> {
    try {
      this.logger.log('Génération des statistiques des sessions');

      const schedules = await this.scheduleRepository.find({
        relations: ['course', 'instructor'],
      });

      const totalSchedules = schedules.length;
      const activeSchedules = schedules.filter(s => s.status === ScheduleStatus.ACTIVE).length;
      const completedSchedules = schedules.filter(s => s.status === ScheduleStatus.COMPLETED).length;
      const cancelledSchedules = schedules.filter(s => s.status === ScheduleStatus.CANCELLED).length;

      const schedulesWithAttendance = schedules.filter(s => s.attendance && s.attendance.length > 0);
      const totalAttendanceEvents = schedulesWithAttendance.length;
      let totalPresentCount = 0;
      let totalExpectedCount = 0;

      schedulesWithAttendance.forEach(schedule => {
        const presentCount = schedule.attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
        totalPresentCount += presentCount;
        totalExpectedCount += schedule.attendance.length;
      });

      const averageAttendanceRate = totalExpectedCount > 0 
        ? Math.round((totalPresentCount / totalExpectedCount) * 10000) / 100 
        : 0;

      const byType = schedules.reduce((acc, schedule) => {
        acc[schedule.type] = (acc[schedule.type] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const byStatus = schedules.reduce((acc, schedule) => {
        acc[schedule.status] = (acc[schedule.status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const dayCount = new Array(7).fill(0);

      schedules.forEach(schedule => {
        const dayIndex = new Date(schedule.date).getDay();
        dayCount[dayIndex]++;
      });

      const byDayOfWeek = daysOfWeek.map((day, index) => ({
        day,
        count: dayCount[index],
      }));

      const timeSlotCount: { [key: string]: number } = {};
      schedules.forEach(schedule => {
        const hour = parseInt(schedule.startTime.split(':')[0]);
        const timeSlot = `${hour}h - ${hour + 1}h`;
        timeSlotCount[timeSlot] = (timeSlotCount[timeSlot] || 0) + 1;
      });

      const popularTimeSlots = Object.entries(timeSlotCount)
        .map(([timeSlot, count]) => ({ timeSlot, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const instructorStats = schedules.reduce((acc, schedule) => {
        if (schedule.instructorId && schedule.instructor) {
          const key = schedule.instructorId;
          if (!acc[key]) {
            acc[key] = {
              instructorId: schedule.instructorId,
              instructorName: `${schedule.instructor.profile?.firstName || ''} ${schedule.instructor.profile?.lastName || ''}`.trim(),
              sessionCount: 0,
              totalPresent: 0,
              totalExpected: 0,
            };
          }
          acc[key].sessionCount++;
          
          if (schedule.attendance) {
            const presentCount = schedule.attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
            acc[key].totalPresent += presentCount;
            acc[key].totalExpected += schedule.attendance.length;
          }
        }
        return acc;
      }, {} as { [key: number]: any });

      const topInstructors = Object.values(instructorStats)
        .map((stats: any) => ({
          instructorId: stats.instructorId,
          instructorName: stats.instructorName,
          sessionCount: stats.sessionCount,
          avgAttendanceRate: stats.totalExpected > 0 
            ? Math.round((stats.totalPresent / stats.totalExpected) * 10000) / 100 
            : 0,
        }))
        .sort((a: any, b: any) => b.sessionCount - a.sessionCount)
        .slice(0, 10);

      return {
        totalSchedules,
        activeSchedules,
        completedSchedules,
        cancelledSchedules,
        averageAttendanceRate,
        byType,
        byStatus,
        byDayOfWeek,
        popularTimeSlots,
        topInstructors,
      };
    } catch (error) {
      this.logger.error(`Erreur génération statistiques sessions: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async checkForConflicts(
    courseId: number,
    instructorId?: number,
    date?: Date,
    startTime?: string,
    endTime?: string,
    room?: string
  ): Promise<Schedule | null> {
    try {
      const where: any = {};
      
      if (date) {
        where.date = date;
      }
      
      if (instructorId) {
        where.instructorId = instructorId;
      }

      if (room) {
        where.room = room;
      }

      where.status = ScheduleStatus.ACTIVE;

      const existingSchedules = await this.scheduleRepository.find({ where });

      for (const schedule of existingSchedules) {
        if (startTime && endTime && schedule.startTime && schedule.endTime) {
          const newStart = startTime;
          const newEnd = endTime;
          const existingStart = schedule.startTime;
          const existingEnd = schedule.endTime;

          if ((newStart < existingEnd && newEnd > existingStart)) {
            return schedule;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Erreur vérification conflits: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async createRecurringSchedules(baseSchedule: Schedule, createDto: CreateScheduleDto): Promise<void> {
    try {
      if (!createDto.recurrencePattern) return;

      const { frequency, daysOfWeek, endDate, maxOccurrences } = createDto.recurrencePattern;
      const maxOccurs = maxOccurrences || 52;
      
      let currentDate = new Date(baseSchedule.date);
      let occurrences = 1;

      for (let i = 1; i < maxOccurs; i++) {
        if (createDto.recurrenceType === RecurrenceType.WEEKLY) {
          currentDate.setDate(currentDate.getDate() + (frequency * 7));
        } else if (createDto.recurrenceType === RecurrenceType.DAILY) {
          currentDate.setDate(currentDate.getDate() + frequency);
        } else if (createDto.recurrenceType === RecurrenceType.MONTHLY) {
          currentDate.setMonth(currentDate.getMonth() + frequency);
        }

        if (endDate && currentDate > new Date(endDate)) {
          break;
        }

        if (daysOfWeek && !daysOfWeek.includes(currentDate.getDay())) {
          continue;
        }

        const recurringSchedule = this.scheduleRepository.create({
          ...createDto,
          date: new Date(currentDate),
          attendees: 0,
          attendance: [],
          recurrenceType: RecurrenceType.NONE,
          recurrencePattern: null,
        });

        await this.scheduleRepository.save(recurringSchedule);
        occurrences++;
      }

      this.logger.log(`${occurrences} sessions récurrentes créées pour la session ID ${baseSchedule.id}`);
    } catch (error) {
      this.logger.error(`Erreur création sessions récurrentes: ${error.message}`, error.stack);
    }
  }
}