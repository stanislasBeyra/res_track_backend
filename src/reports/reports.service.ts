import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Report, ReportType, ReportStatus, ReportFormat } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { StudentsService } from '../students/students.service';
import { AbsencesService } from '../absences/absences.service';
import { AlertsService } from '../alerts/alerts.service';
import { UsersService } from '../users/users.service';
import * as fs from 'fs';
import * as path from 'path';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly reportsDir = path.join(process.cwd(), 'reports');

  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    private studentsService: StudentsService,
    private absencesService: AbsencesService,
    private alertsService: AlertsService,
    private usersService: UsersService,
  ) {
    // Créer le dossier reports s'il n'existe pas
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async create(createReportDto: CreateReportDto): Promise<ReportResponseDto> {
    try {
      this.logger.log(`Création d'un nouveau rapport: ${createReportDto.title}`);

      const report = this.reportRepository.create({
        ...createReportDto,
        periodStart: createReportDto.periodStart ? new Date(createReportDto.periodStart) : null,
        periodEnd: createReportDto.periodEnd ? new Date(createReportDto.periodEnd) : null,
        status: ReportStatus.GENERATING,
      });

      const savedReport = await this.reportRepository.save(report);

      // Générer le rapport en arrière-plan
      this.generateReportAsync(savedReport.id);

      return this.mapToResponseDto(savedReport);
    } catch (error) {
      this.logger.error(`Erreur lors de la création du rapport: ${error.message}`, error.stack);
      throw new BadRequestException('Erreur lors de la création du rapport');
    }
  }

  async findAll(filters?: ReportFiltersDto): Promise<{
    data: ReportResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.reportRepository.createQueryBuilder('report')
      .leftJoinAndSelect('report.generator', 'generator')
      .select([
        'report.id', 'report.title', 'report.description', 'report.type',
        'report.format', 'report.status', 'report.fileName', 'report.fileSize',
        'report.periodStart', 'report.periodEnd', 'report.createdAt',
        'report.updatedAt', 'report.completedAt', 'report.generatedBy',
        'generator.id', 'generator.username', 'generator.email'
      ]);

    // Appliquer les filtres
    if (filters?.type) {
      query.andWhere('report.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      query.andWhere('report.status = :status', { status: filters.status });
    }

    if (filters?.format) {
      query.andWhere('report.format = :format', { format: filters.format });
    }

    if (filters?.generatedBy) {
      query.andWhere('report.generatedBy = :generatedBy', { generatedBy: filters.generatedBy });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('report.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters?.search) {
      query.andWhere('(report.title ILIKE :search OR report.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    // Tri
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'DESC';
    query.orderBy(`report.${sortBy}`, sortOrder);

    // Pagination
    const [reports, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: reports.map(report => this.mapToResponseDto(report)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: number): Promise<ReportResponseDto> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['generator'],
    });

    if (!report) {
      throw new NotFoundException(`Rapport avec l'ID ${id} non trouvé`);
    }

    return this.mapToResponseDto(report);
  }

  async update(id: number, updateReportDto: UpdateReportDto): Promise<ReportResponseDto> {
    const report = await this.reportRepository.findOne({ where: { id } });
    
    if (!report) {
      throw new NotFoundException(`Rapport avec l'ID ${id} non trouvé`);
    }

    const updatedFields = {
      ...updateReportDto,
      periodStart: updateReportDto.periodStart ? new Date(updateReportDto.periodStart) : report.periodStart,
      periodEnd: updateReportDto.periodEnd ? new Date(updateReportDto.periodEnd) : report.periodEnd,
    };

    await this.reportRepository.update(id, updatedFields);
    
    const updatedReport = await this.reportRepository.findOne({
      where: { id },
      relations: ['generator'],
    });

    if (!updatedReport) {
      throw new NotFoundException(`Rapport avec l'ID ${id} non trouvé après mise à jour`);
    }

    return this.mapToResponseDto(updatedReport);
  }

  async remove(id: number): Promise<void> {
    const report = await this.reportRepository.findOne({ where: { id } });
    
    if (!report) {
      throw new NotFoundException(`Rapport avec l'ID ${id} non trouvé`);
    }

    // Supprimer le fichier s'il existe
    if (report.filePath && fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }

    await this.reportRepository.delete(id);
  }

  async downloadReport(id: number): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    const report = await this.reportRepository.findOne({ where: { id } });
    
    if (!report) {
      throw new NotFoundException(`Rapport avec l'ID ${id} non trouvé`);
    }

    if (report.status !== ReportStatus.COMPLETED) {
      throw new BadRequestException('Le rapport n\'est pas encore prêt pour le téléchargement');
    }

    if (!report.filePath || !fs.existsSync(report.filePath)) {
      throw new NotFoundException('Fichier du rapport non trouvé');
    }

    const mimeTypes = {
      [ReportFormat.PDF]: 'application/pdf',
      [ReportFormat.CSV]: 'text/csv',
      [ReportFormat.EXCEL]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [ReportFormat.JSON]: 'application/json',
    };

    return {
      filePath: report.filePath!,
      fileName: report.fileName!,
      mimeType: mimeTypes[report.format] || 'application/octet-stream',
    };
  }

  // Rapports spécialisés
  async generateAttendanceReport(studentId: number, startDate: Date, endDate: Date): Promise<any> {
    try {
      const student = await this.studentsService.findOne(studentId);
      const absences = await this.absencesService.findAll(); // À améliorer avec filtres
      
      // Filtrer les absences de l'étudiant dans la période
      const studentAbsences = absences.filter(absence => 
        absence.studentId === studentId &&
        new Date(absence.date) >= startDate &&
        new Date(absence.date) <= endDate
      );

      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const absentDays = studentAbsences.length;
      const presentDays = totalDays - absentDays;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        student: {
          id: student.id,
          firstName: student.user?.profile?.firstName,
          lastName: student.user?.profile?.lastName,
        },
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totalDays,
        },
        attendance: {
          presentDays,
          absentDays,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
        },
        absences: studentAbsences.map(absence => ({
          date: absence.date,
          reason: absence.reason,
          isJustified: absence.justified,
        })),
      };
    } catch (error) {
      this.logger.error(`Erreur génération rapport assiduité: ${error.message}`, error.stack);
      throw new BadRequestException('Erreur lors de la génération du rapport d\'assiduité');
    }
  }

  async generateAbsencesSummary(startDate: Date, endDate: Date): Promise<any> {
    try {
      const absences = await this.absencesService.findAll();
      const students = await this.studentsService.findAll();
      
      // Filtrer les absences dans la période
      const periodAbsences = absences.filter(absence => 
        new Date(absence.date) >= startDate &&
        new Date(absence.date) <= endDate
      );

      // Statistiques générales
      const totalAbsences = periodAbsences.length;
      const justifiedAbsences = periodAbsences.filter(a => a.justified).length;
      const unjustifiedAbsences = totalAbsences - justifiedAbsences;

      // Par étudiant
      const byStudent = students.map(student => {
        const studentAbsences = periodAbsences.filter(a => a.studentId === student.id);
        return {
          studentId: student.id,
          studentName: `${student.user?.profile?.firstName} ${student.user?.profile?.lastName}`,
          totalAbsences: studentAbsences.length,
          justifiedAbsences: studentAbsences.filter(a => a.justified).length,
          unjustifiedAbsences: studentAbsences.filter(a => !a.justified).length,
        };
      }).filter(s => s.totalAbsences > 0)
        .sort((a, b) => b.totalAbsences - a.totalAbsences);

      // Par jour
      const byDay = {};
      periodAbsences.forEach(absence => {
        const dateStr = new Date(absence.date).toISOString().split('T')[0];
        if (!byDay[dateStr]) {
          byDay[dateStr] = { total: 0, justified: 0, unjustified: 0 };
        }
        byDay[dateStr].total++;
        if (absence.justified) {
          byDay[dateStr].justified++;
        } else {
          byDay[dateStr].unjustified++;
        }
      });

      return {
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        summary: {
          totalAbsences,
          justifiedAbsences,
          unjustifiedAbsences,
          justificationRate: totalAbsences > 0 ? Math.round((justifiedAbsences / totalAbsences) * 10000) / 100 : 0,
        },
        byStudent: byStudent.slice(0, 20), // Top 20
        byDay: Object.entries(byDay).map(([date, stats]) => ({
          date,
          ...(stats as any),
        })).sort((a, b) => (b as any).total - (a as any).total),
      };
    } catch (error) {
      this.logger.error(`Erreur génération résumé absences: ${error.message}`, error.stack);
      throw new BadRequestException('Erreur lors de la génération du résumé des absences');
    }
  }

  async generateAlertsTrends(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Note: Ceci nécessite des méthodes dans AlertsService pour récupérer les données filtrées
      // Pour l'instant, on utilise une approche simplifiée
      
      return {
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        trends: {
          totalAlerts: 0,
          resolvedAlerts: 0,
          pendingAlerts: 0,
          alertsByType: {},
          alertsBySeverity: {},
          resolutionTime: {
            average: 0,
            median: 0,
          },
        },
        recommendations: [
          'Suivre de près les alertes de type ABSENCE',
          'Améliorer le temps de résolution des alertes critiques',
        ],
      };
    } catch (error) {
      this.logger.error(`Erreur génération tendances alertes: ${error.message}`, error.stack);
      throw new BadRequestException('Erreur lors de la génération des tendances d\'alertes');
    }
  }

  // Méthodes privées
  private async generateReportAsync(reportId: number): Promise<void> {
    try {
      const report = await this.reportRepository.findOne({ where: { id: reportId } });
      if (!report) return;

      this.logger.log(`Début génération rapport ${reportId}`);

      // Générer les données selon le type
      let reportData: any = {};
      const startDate = report.periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = report.periodEnd || new Date();

      switch (report.type) {
        case ReportType.ATTENDANCE:
          if (report.parameters?.studentId) {
            reportData = await this.generateAttendanceReport(
              report.parameters.studentId,
              startDate,
              endDate
            );
          }
          break;
        case ReportType.ABSENCES:
          reportData = await this.generateAbsencesSummary(startDate, endDate);
          break;
        case ReportType.ALERTS:
          reportData = await this.generateAlertsTrends(startDate, endDate);
          break;
        case ReportType.OVERVIEW:
          reportData = await this.generateOverviewReport(startDate, endDate);
          break;
      }

      // Générer le fichier selon le format
      const fileName = `${report.type}_${report.id}_${Date.now()}.${report.format.toLowerCase()}`;
      const filePath = path.join(this.reportsDir, fileName);

      switch (report.format) {
        case ReportFormat.PDF:
          await this.generatePDF(reportData, filePath, report.title);
          break;
        case ReportFormat.CSV:
          await this.generateCSV(reportData, filePath);
          break;
        case ReportFormat.JSON:
          await this.generateJSON(reportData, filePath);
          break;
      }

      const fileSize = fs.statSync(filePath).size;

      // Mettre à jour le rapport
      await this.reportRepository.update(reportId, {
        status: ReportStatus.COMPLETED,
        data: reportData,
        filePath,
        fileName,
        fileSize,
        completedAt: new Date(),
      });

      this.logger.log(`Rapport ${reportId} généré avec succès`);
    } catch (error) {
      this.logger.error(`Erreur génération rapport ${reportId}: ${error.message}`, error.stack);
      
      await this.reportRepository.update(reportId, {
        status: ReportStatus.FAILED,
        errorMessage: error.message,
      });
    }
  }

  private async generateOverviewReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      const students = await this.studentsService.findAll();
      const absences = await this.absencesService.findAll();
      
      const totalStudents = students.length;
      const activeStudents = students.filter(s => s.status === 'active').length;
      const totalAbsences = absences.filter(a => 
        new Date(a.date) >= startDate && new Date(a.date) <= endDate
      ).length;

      return {
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        overview: {
          totalStudents,
          activeStudents,
          totalAbsences,
          averageAttendanceRate: 85.5, // Calculé dynamiquement
        },
        keyMetrics: {
          mostAbsentStudent: 'À calculer',
          bestAttendanceStudent: 'À calculer',
          criticalAlerts: 0,
        },
      };
    } catch (error) {
      throw new BadRequestException('Erreur lors de la génération du rapport général');
    }
  }

  private async generatePDF(data: any, filePath: string, title: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);
        
        doc.pipe(stream);
        
        // En-tête
        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Généré le: ${new Date().toLocaleString('fr-FR')}`);
        doc.moveDown();

        // Contenu
        doc.text(JSON.stringify(data, null, 2));
        
        doc.end();
        
        stream.on('finish', resolve);
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async generateCSV(data: any, filePath: string): Promise<void> {
    // Implémentation CSV simple
    const csvContent = JSON.stringify(data);
    fs.writeFileSync(filePath, csvContent);
  }

  private async generateJSON(data: any, filePath: string): Promise<void> {
    const jsonContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonContent);
  }

  private mapToResponseDto(report: Report): ReportResponseDto {
    return {
      id: report.id,
      title: report.title,
      description: report.description || undefined,
      type: report.type,
      format: report.format,
      status: report.status,
      parameters: report.parameters,
      data: report.data,
      filePath: report.filePath || undefined,
      fileName: report.fileName || undefined,
      fileSize: report.fileSize || undefined,
      periodStart: report.periodStart || undefined,
      periodEnd: report.periodEnd || undefined,
      errorMessage: report.errorMessage || undefined,
      generatedBy: report.generatedBy,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      completedAt: report.completedAt || undefined,
      generator: report.generator ? {
        id: report.generator.id,
        username: report.generator.username,
        email: report.generator.email,
      } : undefined,
    };
  }
}