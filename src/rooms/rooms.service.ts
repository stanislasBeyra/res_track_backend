import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomStatus } from './entities/room.entity';
import { Student } from '../students/entities/student.entity';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  async create(createDto: CreateRoomDto): Promise<Room> {
    // Vérifier l'unicité du numéro de chambre
    const existing = await this.roomRepository.findOne({
      where: { roomNumber: createDto.roomNumber },
    });

    if (existing) {
      throw new BadRequestException('Ce numéro de chambre existe déjà');
    }

    const room = this.roomRepository.create(createDto);
    return this.roomRepository.save(room);
  }

  async findAll(status?: RoomStatus): Promise<Room[]> {
    const query = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.students', 'students')
      .leftJoinAndSelect('students.user', 'user')
      .orderBy('room.building', 'ASC')
      .addOrderBy('room.floor', 'ASC')
      .addOrderBy('room.roomNumber', 'ASC');

    if (status) {
      query.where('room.status = :status', { status });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ['students', 'students.user'],
    });

    if (!room) {
      throw new NotFoundException('Chambre non trouvée');
    }

    return room;
  }

  async update(id: number, updateDto: Partial<CreateRoomDto>): Promise<Room> {
    const room = await this.findOne(id);
    Object.assign(room, updateDto);
    return this.roomRepository.save(room);
  }

  async assignStudent(roomId: number, studentId: number): Promise<Room> {
    const room = await this.findOne(roomId);
    const student = await this.studentRepository.findOne({ where: { id: studentId } });

    if (!student) {
      throw new NotFoundException('Étudiant non trouvé');
    }

    // Vérifier la capacité
    if (room.currentOccupants >= room.capacity) {
      throw new BadRequestException('Chambre pleine');
    }

    // Retirer l'étudiant de son ancienne chambre si nécessaire
    if (student.roomId) {
      const oldRoom = await this.roomRepository.findOne({ where: { id: student.roomId } });
      if (oldRoom) {
        oldRoom.currentOccupants--;
        await this.roomRepository.save(oldRoom);
      }
    }

    // Assigner la nouvelle chambre
    student.roomId = roomId;
    room.currentOccupants++;

    await this.studentRepository.save(student);
    await this.roomRepository.save(room);

    return this.findOne(roomId);
  }

  async removeStudent(studentId: number): Promise<void> {
    const student = await this.studentRepository.findOne({ where: { id: studentId } });

    if (!student || !student.roomId) {
      throw new NotFoundException('Étudiant non trouvé ou non assigné');
    }

    const room = await this.roomRepository.findOne({ where: { id: student.roomId } });
    if (room) {
      room.currentOccupants--;
      await this.roomRepository.save(room);
    }

    student.roomId = null;
    await this.studentRepository.save(student);
  }

  async remove(id: number): Promise<void> {
    const room = await this.findOne(id);

    if (room.currentOccupants > 0) {
      throw new BadRequestException('Impossible de supprimer une chambre occupée');
    }

    await this.roomRepository.remove(room);
  }
}
