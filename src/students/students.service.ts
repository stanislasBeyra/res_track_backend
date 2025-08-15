import { Injectable, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from './entities/student.entity';
import { User } from '../users/entities/user.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    try {
      this.logger.log(`Création d'étudiant avec le numéro: ${createStudentDto.studentNumber}`);
      
      // Vérifier que le numéro étudiant n'existe pas déjà
      const existingStudent = await this.studentsRepository.findOne({
        where: { studentNumber: createStudentDto.studentNumber },
      });

      if (existingStudent) {
        throw new ConflictException(`Un étudiant avec le numéro ${createStudentDto.studentNumber} existe déjà`);
      }

      // Vérifier que l'utilisateur existe si userId est fourni
      if (createStudentDto.userId) {
        const user = await this.usersRepository.findOne({
          where: { id: createStudentDto.userId },
        });

        if (!user) {
          throw new NotFoundException(`Utilisateur avec l'ID ${createStudentDto.userId} non trouvé`);
        }
      }

      const student = this.studentsRepository.create({
        ...createStudentDto,
        enrollmentDate: new Date(createStudentDto.enrollmentDate),
        graduationDate: createStudentDto.graduationDate ? new Date(createStudentDto.graduationDate) : null,
        status: createStudentDto.status || StudentStatus.ACTIVE,
      });

      const savedStudent = await this.studentsRepository.save(student);
      this.logger.log(`Étudiant créé avec l'ID: ${savedStudent.id}`);
      
      return savedStudent;
    } catch (error) {
      this.logger.error(`Erreur lors de la création de l'étudiant: ${error.message}`, error.stack);
      
      if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erreur lors de la création de l\'étudiant');
    }
  }

  async findAll(): Promise<Student[]> {
    try {
      return await this.studentsRepository.find({
        relations: ['user', 'user.profile', 'alerts'],
        order: { enrollmentDate: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des étudiants: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des étudiants');
    }
  }

  async findOne(id: number): Promise<Student> {
    try {
      const student = await this.studentsRepository.findOne({
        where: { id },
        relations: ['user', 'user.profile', 'alerts'],
      });

      if (!student) {
        throw new NotFoundException(`Étudiant avec l'ID ${id} non trouvé`);
      }

      return student;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Erreur lors de la récupération de l'étudiant: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération de l\'étudiant');
    }
  }

  async findByStudentNumber(studentNumber: string): Promise<Student> {
    try {
      const student = await this.studentsRepository.findOne({
        where: { studentNumber },
        relations: ['user', 'user.profile', 'alerts'],
      });

      if (!student) {
        throw new NotFoundException(`Étudiant avec le numéro ${studentNumber} non trouvé`);
      }

      return student;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Erreur lors de la récupération de l'étudiant par numéro: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération de l\'étudiant par numéro');
    }
  }

  async findByClass(className: string): Promise<Student[]> {
    try {
      return await this.studentsRepository.find({
        where: { class: className },
        relations: ['user', 'user.profile', 'alerts'],
        order: { enrollmentDate: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des étudiants par classe: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des étudiants par classe');
    }
  }

  async findByStatus(status: StudentStatus): Promise<Student[]> {
    try {
      return await this.studentsRepository.find({
        where: { status },
        relations: ['user', 'user.profile', 'alerts'],
        order: { enrollmentDate: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des étudiants par statut: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des étudiants par statut');
    }
  }

  async update(id: number, updateStudentDto: UpdateStudentDto): Promise<Student> {
    try {
      const student = await this.findOne(id);
      
      // Vérifier le numéro étudiant si modifié
      if (updateStudentDto.studentNumber && updateStudentDto.studentNumber !== student.studentNumber) {
        const existingStudent = await this.studentsRepository.findOne({
          where: { studentNumber: updateStudentDto.studentNumber },
        });

        if (existingStudent) {
          throw new ConflictException(`Un étudiant avec le numéro ${updateStudentDto.studentNumber} existe déjà`);
        }
      }

      const updateData = {
        ...updateStudentDto,
        enrollmentDate: updateStudentDto.enrollmentDate ? new Date(updateStudentDto.enrollmentDate) : student.enrollmentDate,
        graduationDate: updateStudentDto.graduationDate ? new Date(updateStudentDto.graduationDate) : student.graduationDate,
      };

      await this.studentsRepository.update(id, updateData);
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      
      this.logger.error(`Erreur lors de la mise à jour de l'étudiant: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la mise à jour de l\'étudiant');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const student = await this.findOne(id);
      await this.studentsRepository.remove(student);
      this.logger.log(`Étudiant avec l'ID ${id} supprimé`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Erreur lors de la suppression de l'étudiant: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la suppression de l\'étudiant');
    }
  }

  async getStatistics(): Promise<any> {
    try {
      const total = await this.studentsRepository.count();
      const active = await this.studentsRepository.count({ where: { status: StudentStatus.ACTIVE } });
      const inactive = await this.studentsRepository.count({ where: { status: StudentStatus.INACTIVE } });
      const suspended = await this.studentsRepository.count({ where: { status: StudentStatus.SUSPENDED } });
      const graduated = await this.studentsRepository.count({ where: { status: StudentStatus.GRADUATED } });
      
      const byClass = await this.studentsRepository
        .createQueryBuilder('student')
        .select('student.class', 'class')
        .addSelect('COUNT(*)', 'count')
        .groupBy('student.class')
        .getRawMany();

      return {
        total,
        byStatus: {
          active,
          inactive,
          suspended,
          graduated,
        },
        byClass: byClass.reduce((acc, item) => {
          acc[item.class] = parseInt(item.count);
          return acc;
        }, {}),
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des statistiques: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la récupération des statistiques');
    }
  }
}
