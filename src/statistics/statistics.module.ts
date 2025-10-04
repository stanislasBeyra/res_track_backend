import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { Statistic } from './entities/statistic.entity';
import { StudentsModule } from '../students/students.module';
import { AbsencesModule } from '../absences/absences.module';
import { AlertsModule } from '../alerts/alerts.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Statistic]),
    StudentsModule,
    AbsencesModule,
    AlertsModule,
    UsersModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}