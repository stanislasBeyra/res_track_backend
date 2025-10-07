import { IsString, IsNotEmpty, IsInt, IsEnum, IsOptional, Min, MaxLength } from 'class-validator';
import { RoomStatus } from '../entities/room.entity';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  roomNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  building: string;

  @IsInt()
  @Min(0)
  floor: number;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
