import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Absence, AbsenceReason } from './entities/absence.entity';
import { Student } from '../students/entities/student.entity';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';

@Injectable()
export class AbsencesService {
  private readonly logger = new Logger(AbsencesService.name);

  constructor(
    @InjectRepository(Absence)
    private absencesRepository: Repository<Absence>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
  ) {}

  async create(createAbsenceDto: CreateAbsenceDto): Promise<Absence> {
    try {
      this.logger.log(`Création d'absence pour l'étudiant ID: ${createAbsenceDto.studentId}`);
      
      // Vérifier que l'étudiant existe
      const student = await this.studentsRepository.findOne({
        where: { id: createAbsenceDto.studentId },
      });

      if (!student) {
        throw new NotFoundException(`Étudiant avec l'ID ${createAbsenceDto.studentId} non trouvé`);
      }

      const absence = this.absencesRepository.create({
        ...createAbsenceDto,
        date: new Date(createAbsenceDto.date),
        verifiedAt: createAbsenceDto.verifiedBy ? new Date() : null,
      });

      const savedAbsence = await this.absencesRepository.save(absence);
      this.logger.log(`Absence créée avec l'ID: ${savedAbsence.id}`);
      
      return savedAbsence;
    } catch (error) {
      this.logger.error(`Erreur lors de la création de l'absence: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erreur lors de la création de l\'absence');
    }
  }

  async findAll(): Promise<Absence[]> {
    try {
      return await this.absencesRepository.find({
        relations: ['student', 'student.user', 'student.user.profile'],
        order: { date: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des absences: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des absences');
    }
  }

  async findOne(id: number): Promise<Absence> {
    try {
      const absence = await this.absencesRepository.findOne({
        where: { id },
        relations: ['student', 'student.user', 'student.user.profile'],
      });

      if (!absence) {
        throw new NotFoundException(`Absence avec l'ID ${id} non trouvée`);
      }

      return absence;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Erreur lors de la récupération de l'absence: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération de l\'absence');
    }
  }

  async findByStudentId(studentId: number): Promise<Absence[]> {
    try {
      return await this.absencesRepository.find({
        where: { studentId },
        relations: ['student', 'student.user', 'student.user.profile'],
        order: { date: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des absences de l'étudiant: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des absences de l\'étudiant');
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Absence[]> {
    try {
      return await this.absencesRepository.find({
        where: {
          date: Between(startDate, endDate),
        },
        relations: ['student', 'student.user', 'student.user.profile'],
        order: { date: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des absences par période: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des absences par période');
    }
  }

  async update(id: number, updateAbsenceDto: UpdateAbsenceDto): Promise<Absence> {
    try {
      const absence = await this.findOne(id);
      
      const updateData = {
        ...updateAbsenceDto,
        verifiedAt: updateAbsenceDto.verifiedBy ? new Date() : absence.verifiedAt,
      };

      await this.absencesRepository.update(id, updateData);
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Erreur lors de la mise à jour de l'absence: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la mise à jour de l\'absence');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const absence = await this.findOne(id);
      await this.absencesRepository.remove(absence);
      this.logger.log(`Absence avec l'ID ${id} supprimée`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Erreur lors de la suppression de l'absence: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la suppression de l\'absence');
    }
  }

  async getStatistics(): Promise<any> {
    try {
      const total = await this.absencesRepository.count();
      const justified = await this.absencesRepository.count({ where: { justified: true } });
      const unjustified = total - justified;
      
      const byReason = await this.absencesRepository
        .createQueryBuilder('absence')
        .select('absence.reason', 'reason')
        .addSelect('COUNT(*)', 'count')
        .groupBy('absence.reason')
        .getRawMany();

      return {
        total,
        justified,
        unjustified,
        byReason: byReason.reduce((acc, item) => {
          acc[item.reason] = parseInt(item.count);
          return acc;
        }, {}),
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des statistiques: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des statistiques');
    }
  }
}
