import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AlertsModule } from './alerts/alerts.module';
import { AbsencesModule } from './absences/absences.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    NotificationsModule,
    AlertsModule,
    AbsencesModule,
   
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
