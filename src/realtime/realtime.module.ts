import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { PresenceService } from './presence.service';
import { NotificationService } from './notification.service';
import { ChatService } from './chat.service';
import { LiveUpdatesService } from './live-updates.service';
import { RealtimeController } from './realtime.controller';
import { ServiceIntegrator } from './integrations/service-integrator';

import { Notification } from './entities/realtime-notification.entity';
import { Chat } from './entities/chat.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { User } from '../users/entities/user.entity';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      Chat, 
      ChatMessage,
      ChatParticipant,
      User,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    UsersModule,
  ],
  controllers: [RealtimeController],
  providers: [
    RealtimeGateway,
    RealtimeService,
    PresenceService,
    NotificationService,
    ChatService,
    LiveUpdatesService,
    ServiceIntegrator,
  ],
  exports: [
    RealtimeService,
    PresenceService,
    NotificationService,
    ChatService,
    LiveUpdatesService,
    ServiceIntegrator,
  ],
})
export class RealtimeModule {}