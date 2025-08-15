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
import { AbsencesService } from './absences.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';

@ApiTags('Absences')
@ApiBearerAuth()
@Controller('absences')
export class AbsencesController {
  constructor(private readonly absencesService: AbsencesService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Enregistrer une nouvelle absence',
    description: 'Crée un nouvel enregistrement d\'absence pour un étudiant' 
  })
  @ApiBody({ type: CreateAbsenceDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Absence enregistrée avec succès' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données invalides' 
  })
  create(@Body() createAbsenceDto: CreateAbsenceDto) {
    return this.absencesService.create(createAbsenceDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Récupérer toutes les absences',
    description: 'Retourne la liste de toutes les absences enregistrées' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des absences récupérée avec succès' 
  })
  findAll() {
    return this.absencesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer une absence par ID',
    description: 'Retourne les détails d\'une absence spécifique' 
  })
  @ApiParam({ name: 'id', description: 'ID de l\'absence' })
  @ApiResponse({ 
    status: 200, 
    description: 'Absence trouvée' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Absence non trouvée' 
  })
  findOne(@Param('id') id: string) {
    return this.absencesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Mettre à jour une absence',
    description: 'Met à jour les informations d\'une absence (ex: justification)' 
  })
  @ApiParam({ name: 'id', description: 'ID de l\'absence' })
  @ApiBody({ type: UpdateAbsenceDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Absence mise à jour avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Absence non trouvée' 
  })
  update(@Param('id') id: string, @Body() updateAbsenceDto: UpdateAbsenceDto) {
    return this.absencesService.update(+id, updateAbsenceDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Supprimer une absence',
    description: 'Supprime un enregistrement d\'absence' 
  })
  @ApiParam({ name: 'id', description: 'ID de l\'absence' })
  @ApiResponse({ 
    status: 200, 
    description: 'Absence supprimée avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Absence non trouvée' 
  })
  remove(@Param('id') id: string) {
    return this.absencesService.remove(+id);
  }
}
