import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth, 
  ApiParam 
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Créer un nouvel étudiant',
    description: 'Ajoute un nouvel étudiant au système' 
  })
  @ApiBody({ type: CreateStudentDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Étudiant créé avec succès' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données invalides' 
  })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Récupérer tous les étudiants',
    description: 'Retourne la liste de tous les étudiants' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des étudiants récupérée avec succès' 
  })
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer un étudiant par ID',
    description: 'Retourne les détails d\'un étudiant spécifique' 
  })
  @ApiParam({ name: 'id', description: 'ID de l\'étudiant' })
  @ApiResponse({ 
    status: 200, 
    description: 'Étudiant trouvé' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Étudiant non trouvé' 
  })
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Mettre à jour un étudiant',
    description: 'Met à jour les informations d\'un étudiant' 
  })
  @ApiParam({ name: 'id', description: 'ID de l\'étudiant' })
  @ApiBody({ type: UpdateStudentDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Étudiant mis à jour avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Étudiant non trouvé' 
  })
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(+id, updateStudentDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Supprimer un étudiant',
    description: 'Supprime un étudiant du système' 
  })
  @ApiParam({ name: 'id', description: 'ID de l\'étudiant' })
  @ApiResponse({ 
    status: 200, 
    description: 'Étudiant supprimé avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Étudiant non trouvé' 
  })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(+id);
  }
}
