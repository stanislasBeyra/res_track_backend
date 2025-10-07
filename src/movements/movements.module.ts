import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { Movement } from './entities/movement.entity';
import { Student } from '../students/entities/student.entity';
import { ExitPermissionsModule } from '../exit-permissions/exit-permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movement, Student]),
    ExitPermissionsModule,
  ],
  controllers: [MovementsController],
  providers: [MovementsService],
  exports: [MovementsService],
})
export class MovementsModule {}
