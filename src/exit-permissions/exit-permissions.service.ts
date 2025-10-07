import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExitPermission, PermissionStatus } from './entities/exit-permission.entity';
import { Student } from '../students/entities/student.entity';
import { CreateExitPermissionDto } from './dto/create-exit-permission.dto';
import { ApproveExitPermissionDto } from './dto/approve-exit-permission.dto';
import * as QRCode from 'qrcode';

@Injectable()
export class ExitPermissionsService {
  constructor(
    @InjectRepository(ExitPermission)
    private exitPermissionRepository: Repository<ExitPermission>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  /**
   * Générer un code de sortie unique
   */
  private async generateExitCode(): Promise<string> {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    const code = `EXIT-${year}-${randomNum}`;

    // Vérifier l'unicité
    const existing = await this.exitPermissionRepository.findOne({ where: { exitCode: code } });
    if (existing) {
      // Si collision, réessayer
      return this.generateExitCode();
    }

    return code;
  }

  /**
   * Générer un QR code à partir du code de sortie
   */
  private async generateQRCode(exitCode: string): Promise<string> {
    try {
      // Générer le QR code en base64
      const qrCodeDataUrl = await QRCode.toDataURL(exitCode, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Erreur lors de la génération du QR code:', error);
      return '';
    }
  }

  /**
   * Créer une demande de permission de sortie
   */
  async create(studentId: number, createDto: CreateExitPermissionDto): Promise<ExitPermission> {
    // Vérifier que l'étudiant existe
    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Étudiant non trouvé');
    }

    // Vérifier que la date de fin est après la date de début
    const startTime = new Date(createDto.startTime);
    const endTime = new Date(createDto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('La date de fin doit être après la date de début');
    }

    // Vérifier que la demande est pour le futur
    if (startTime < new Date()) {
      throw new BadRequestException('La date de début doit être dans le futur');
    }

    // Générer le code de sortie
    const exitCode = await this.generateExitCode();

    // Créer la permission
    const permission = this.exitPermissionRepository.create({
      studentId,
      exitCode,
      reason: createDto.reason,
      description: createDto.description,
      startTime,
      endTime,
      status: PermissionStatus.PENDING,
    });

    return this.exitPermissionRepository.save(permission);
  }

  /**
   * Récupérer toutes les demandes de permission (admin)
   */
  async findAll(status?: PermissionStatus): Promise<ExitPermission[]> {
    const query = this.exitPermissionRepository
      .createQueryBuilder('permission')
      .leftJoinAndSelect('permission.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .orderBy('permission.createdAt', 'DESC');

    if (status) {
      query.where('permission.status = :status', { status });
    }

    return query.getMany();
  }

  /**
   * Récupérer les demandes d'un étudiant
   */
  async findByStudent(studentId: number): Promise<ExitPermission[]> {
    return this.exitPermissionRepository.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Récupérer une permission par ID
   */
  async findOne(id: number): Promise<ExitPermission> {
    const permission = await this.exitPermissionRepository.findOne({
      where: { id },
      relations: ['student', 'student.user'],
    });

    if (!permission) {
      throw new NotFoundException('Permission non trouvée');
    }

    return permission;
  }

  /**
   * Récupérer une permission par code
   */
  async findByCode(exitCode: string): Promise<ExitPermission> {
    const permission = await this.exitPermissionRepository.findOne({
      where: { exitCode },
      relations: ['student', 'student.user'],
    });

    if (!permission) {
      throw new NotFoundException('Code de sortie invalide');
    }

    return permission;
  }

  /**
   * Valider ou rejeter une demande (admin)
   */
  async approve(id: number, adminId: number, approveDto: ApproveExitPermissionDto): Promise<ExitPermission> {
    const permission = await this.findOne(id);

    if (permission.status !== PermissionStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    if (approveDto.approved) {
      // Approuver et générer le QR code
      const qrCode = await this.generateQRCode(permission.exitCode);

      permission.status = PermissionStatus.APPROVED;
      permission.approvedBy = adminId;
      permission.approvedAt = new Date();
      permission.qrCode = qrCode;
    } else {
      // Rejeter
      permission.status = PermissionStatus.REJECTED;
      permission.approvedBy = adminId;
      permission.approvedAt = new Date();
      permission.rejectionReason = approveDto.rejectionReason || 'Aucune raison fournie';
    }

    return this.exitPermissionRepository.save(permission);
  }

  /**
   * Vérifier si une permission est valide pour utilisation
   * Pour l'admin: pas de vérification de dates, juste que la permission est approuvée
   */
  async verifyPermission(exitCode: string, skipDateValidation = true): Promise<{ valid: boolean; permission?: ExitPermission; message?: string }> {
    try {
      const permission = await this.findByCode(exitCode);

      // Vérifier le statut
      if (permission.status !== PermissionStatus.APPROVED && permission.status !== PermissionStatus.USED) {
        return {
          valid: false,
          message: `Permission ${permission.status}`,
        };
      }

      // Pour l'admin, on permet d'utiliser le code plusieurs fois (entrée ET sortie)
      // La vérification "déjà utilisé" est désactivée quand skipDateValidation = true
      if (!skipDateValidation && permission.isUsed) {
        return {
          valid: false,
          message: 'Code déjà utilisé',
        };
      }

      // Si skipDateValidation est false (pour validation côté étudiant), vérifier les dates
      if (!skipDateValidation) {
        const now = new Date();

        // Tolérance de 1 heure avant le startTime pour permettre une sortie anticipée
        const toleranceMs = 60 * 60 * 1000; // 1 heure en millisecondes
        const startTimeWithTolerance = new Date(permission.startTime.getTime() - toleranceMs);

        if (now < startTimeWithTolerance) {
          const timeDiff = Math.ceil((permission.startTime.getTime() - now.getTime()) / (60 * 1000)); // en minutes
          return {
            valid: false,
            message: `La permission sera active dans ${timeDiff} minutes`,
          };
        }

        if (now > permission.endTime) {
          // Marquer comme expirée
          permission.status = PermissionStatus.EXPIRED;
          await this.exitPermissionRepository.save(permission);

          return {
            valid: false,
            message: 'Permission expirée',
          };
        }
      }

      return {
        valid: true,
        permission,
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message || 'Code invalide',
      };
    }
  }

  /**
   * Marquer une permission comme utilisée
   */
  async markAsUsed(id: number): Promise<ExitPermission> {
    const permission = await this.findOne(id);

    permission.isUsed = true;
    permission.usedAt = new Date();
    permission.status = PermissionStatus.USED;

    return this.exitPermissionRepository.save(permission);
  }

  /**
   * Supprimer une demande (seulement si pending)
   */
  async remove(id: number, studentId: number): Promise<void> {
    const permission = await this.findOne(id);

    // Vérifier que c'est bien la demande de cet étudiant
    if (permission.studentId !== studentId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer cette demande');
    }

    // On ne peut supprimer que les demandes en attente
    if (permission.status !== PermissionStatus.PENDING) {
      throw new BadRequestException('Vous ne pouvez supprimer que les demandes en attente');
    }

    await this.exitPermissionRepository.remove(permission);
  }
}
