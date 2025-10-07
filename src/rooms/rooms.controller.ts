import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../auth/guards/wt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoomStatus } from './entities/room.entity';
import { UserRole } from '../users/entities/user.entity';

@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body() createDto: CreateRoomDto) {
    return this.roomsService.create(createDto);
  }

  @Get()
  findAll(@Query('status') status?: RoomStatus) {
    return this.roomsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: Partial<CreateRoomDto>) {
    return this.roomsService.update(id, updateDto);
  }

  @Post(':id/assign/:studentId')
  assignStudent(
    @Param('id', ParseIntPipe) roomId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.roomsService.assignStudent(roomId, studentId);
  }

  @Delete('unassign/:studentId')
  removeStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.roomsService.removeStudent(studentId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.remove(id);
  }
}
