import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

// Import de toutes les entités (adapte les chemins si besoin)
import { User } from '../users/entities/user.entity';
import { Profile } from '../users/entities/profile.entity';
import { Student } from '../students/entities/student.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { Absence } from '../absences/entities/absence.entity';
import { config } from 'process';
// Ajoute d'autres entités si besoin

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  console.log('database::',configService.get('DB_HOST'));
  return {
    type: configService.get('DB_TYPE', 'mysql') as any,
    host: configService.get('DB_HOST', 'localhost'),
    port: parseInt(configService.get('DB_PORT', '3306')),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: `${configService.get('DB_DATABASE')}`,
    entities: [User, Profile, Student, Notification, Alert, Absence],
    synchronize: !isProduction && configService.get('DB_SYNCHRONIZE', 'true') === 'true',
    logging: configService.get('DB_LOGGING', 'false') === 'true',
    dropSchema: configService.get('DB_DROP_SCHEMA', 'false') === 'true',
    migrations: ['dist/database/migrations/*.js'],
    migrationsTableName: 'typeorm_migrations',
    migrationsRun: configService.get('RUN_MIGRATIONS', 'false') === 'true',
    ssl: isProduction ? {
      rejectUnauthorized: configService.get('DB_SSL_REJECT_UNAUTHORIZED', 'true') === 'true'
    } : false,
    extra: {
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
    },
    autoLoadEntities: true,
    retryAttempts: 3,
    retryDelay: 3000,
    timezone: 'Z',
    ...(configService.get('DB_TYPE') === 'mysql' && {
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
    }),
  };
};

export const dataSourceOptions: DataSourceOptions = {
  type: process.env.DB_TYPE as any || 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [
    'src/**/*.entity{.ts,.js}',
    'dist/**/*.entity{.ts,.js}',
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
};

export const AppDataSource = new DataSource(dataSourceOptions);