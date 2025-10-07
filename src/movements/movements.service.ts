import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Movement, MovementType, MovementMethod } from './entities/movement.entity';
import { Student } from '../students/entities/student.entity';
import { ExitPermissionsService } from '../exit-permissions/exit-permissions.service';
import { CreateMovementDto } from './dto/create-movement.dto';

@Injectable()
export class MovementsService {
  constructor(
    @InjectRepository(Movement)
    private movementRepository: Repository<Movement>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private exitPermissionsService: ExitPermissionsService,
  ) {}

  /**
   * Enregistrer un mouvement (entrée ou sortie)
   */
  async create(createDto: CreateMovementDto, recordedBy?: number): Promise<Movement> {
    let student: Student | null = null;
    let hasPermission = false;
    let exitPermissionId: number | null = null;

    // Si on a un code de sortie, vérifier la permission
    if (createDto.exitCode) {
      const verification = await this.exitPermissionsService.verifyPermission(createDto.exitCode);

      if (!verification.valid || !verification.permission) {
        throw new BadRequestException(verification.message || 'Code de sortie invalide');
      }

      student = await this.studentRepository.findOne({
        where: { id: verification.permission.studentId },
      });

      hasPermission = true;
      exitPermissionId = verification.permission.id;

      // Marquer la permission comme utilisée si c'est une sortie
      if (createDto.type === MovementType.EXIT) {
        await this.exitPermissionsService.markAsUsed(verification.permission.id);
      }
    } else if (createDto.studentId) {
      // Sinon utiliser l'ID étudiant
      student = await this.studentRepository.findOne({
        where: { id: createDto.studentId },
      });
    } else {
      throw new BadRequestException('Code de sortie ou ID étudiant requis');
    }

    if (!student) {
      throw new NotFoundException('Étudiant non trouvé');
    }

    // Vérifier la cohérence : si l'étudiant est déjà dans la résidence, il ne peut pas entrer
    if (createDto.type === MovementType.ENTRY && student.isInResidence) {
      throw new BadRequestException('L\'étudiant est déjà dans la résidence');
    }

    // Si l'étudiant est dehors, il ne peut pas sortir
    if (createDto.type === MovementType.EXIT && !student.isInResidence) {
      throw new BadRequestException('L\'étudiant n\'est pas dans la résidence');
    }

    // Créer le mouvement
    const movement = this.movementRepository.create({
      studentId: student.id,
      exitPermissionId,
      type: createDto.type,
      method: createDto.method || MovementMethod.QR_CODE,
      notes: createDto.notes,
      recordedBy,
      hasPermission,
      isValid: true,
    });

    const savedMovement = await this.movementRepository.save(movement);

    // Mettre à jour le statut de l'étudiant
    student.isInResidence = createDto.type === MovementType.ENTRY;
    student.lastMovementAt = new Date();
    await this.studentRepository.save(student);

    return savedMovement;
  }

  /**
   * Récupérer tous les mouvements avec filtres
   */
  async findAll(
    studentId?: number,
    type?: MovementType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Movement[]> {
    const query = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student.room', 'room')
      .leftJoinAndSelect('movement.exitPermission', 'exitPermission')
      .orderBy('movement.timestamp', 'DESC');

    if (studentId) {
      query.andWhere('movement.studentId = :studentId', { studentId });
    }

    if (type) {
      query.andWhere('movement.type = :type', { type });
    }

    if (startDate && endDate) {
      query.andWhere('movement.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return query.getMany();
  }

  /**
   * Récupérer les mouvements d'un étudiant
   */
  async findByStudent(studentId: number): Promise<Movement[]> {
    return this.movementRepository.find({
      where: { studentId },
      relations: ['exitPermission'],
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * Récupérer les étudiants actuellement dans la résidence
   */
  async getStudentsInResidence(): Promise<Student[]> {
    return this.studentRepository.find({
      where: { isInResidence: true },
      relations: ['user', 'room'],
      order: { lastMovementAt: 'DESC' },
    });
  }

  /**
   * Récupérer les étudiants actuellement hors résidence
   */
  async getStudentsOutResidence(): Promise<Student[]> {
    return this.studentRepository.find({
      where: { isInResidence: false },
      relations: ['user', 'room'],
      order: { lastMovementAt: 'DESC' },
    });
  }

  /**
   * Statistiques des mouvements
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const query = this.movementRepository.createQueryBuilder('movement');

    if (startDate && endDate) {
      query.where('movement.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [totalMovements, entries, exits] = await Promise.all([
      query.getCount(),
      query.clone().andWhere('movement.type = :type', { type: MovementType.ENTRY }).getCount(),
      query.clone().andWhere('movement.type = :type', { type: MovementType.EXIT }).getCount(),
    ]);

    const [studentsIn, studentsOut] = await Promise.all([
      this.studentRepository.count({ where: { isInResidence: true } }),
      this.studentRepository.count({ where: { isInResidence: false } }),
    ]);

    const movementsWithoutPermission = await this.movementRepository.count({
      where: {
        type: MovementType.EXIT,
        hasPermission: false,
      },
    });

    return {
      totalMovements,
      entries,
      exits,
      studentsInResidence: studentsIn,
      studentsOutResidence: studentsOut,
      movementsWithoutPermission,
    };
  }

  /**
   * Récupérer un mouvement par ID
   */
  async findOne(id: number): Promise<Movement> {
    const movement = await this.movementRepository.findOne({
      where: { id },
      relations: ['student', 'student.user', 'exitPermission'],
    });

    if (!movement) {
      throw new NotFoundException('Mouvement non trouvé');
    }

    return movement;
  }
}
