import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExitPermissionsService } from './exit-permissions.service';
import { ExitPermissionsController } from './exit-permissions.controller';
import { ExitPermission } from './entities/exit-permission.entity';
import { Student } from '../students/entities/student.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExitPermission, Student])],
  controllers: [ExitPermissionsController],
  providers: [ExitPermissionsService],
  exports: [ExitPermissionsService],
})
export class ExitPermissionsModule {}
