import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AbsencesService } from './absences.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';

@Controller('absences')
export class AbsencesController {
  constructor(private readonly absencesService: AbsencesService) {}

  @Post()
  create(@Body() createAbsenceDto: CreateAbsenceDto) {
    return this.absencesService.create(createAbsenceDto);
  }

  @Get()
  findAll() {
    return this.absencesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.absencesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAbsenceDto: UpdateAbsenceDto) {
    return this.absencesService.update(+id, updateAbsenceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.absencesService.remove(+id);
  }
}
