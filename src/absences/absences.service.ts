import { Injectable } from '@nestjs/common';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';

@Injectable()
export class AbsencesService {
  create(createAbsenceDto: CreateAbsenceDto) {
    return 'This action adds a new absence';
  }

  findAll() {
    return `This action returns all absences`;
  }

  findOne(id: number) {
    return `This action returns a #${id} absence`;
  }

  update(id: number, updateAbsenceDto: UpdateAbsenceDto) {
    return `This action updates a #${id} absence`;
  }

  remove(id: number) {
    return `This action removes a #${id} absence`;
  }
}
