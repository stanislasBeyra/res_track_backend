import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.checkConnection();
  }

  async checkConnection(): Promise<void> {
    try {
      if (this.dataSource.isInitialized) {
        this.logger.log('✅ Connexion à la base de données établie avec succès');
        await this.logDatabaseInfo();
      } else {
        this.logger.warn('⚠️ La base de données n\'est pas encore initialisée');
      }
    } catch (error) {
      this.logger.error('❌ Erreur de connexion à la base de données:', error.message);
      throw error;
    }
  }

  private async logDatabaseInfo(): Promise<void> {
    try {
      const dbType = this.configService.get('DB_TYPE');
      const dbHost = this.configService.get('DB_HOST');
      const dbPort = this.configService.get('DB_PORT');
      const dbName = this.configService.get('DB_DATABASE');
      this.logger.log(`📊 Type: ${dbType}`);
      this.logger.log(`🌐 Host: ${dbHost}:${dbPort}`);
      this.logger.log(`💾 Database: ${dbName}`);
      const queryRunner = this.dataSource.createQueryRunner();
      if (dbType === 'mysql') {
        const tables = await queryRunner.query('SHOW TABLES');
        this.logger.log(`📋 Tables trouvées: ${tables.length}`);
        if (tables.length > 0) {
          const tableNames = tables.map((table: any) => Object.values(table)[0]).join(', ');
          this.logger.debug(`📝 Tables: ${tableNames}`);
        }
      } else if (dbType === 'postgres') {
        const tables = await queryRunner.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        this.logger.log(`📋 Tables trouvées: ${tables.length}`);
      }
      await queryRunner.release();
    } catch (error) {
      this.logger.warn(`⚠️ Impossible de récupérer les informations de la base: ${error.message}`);
    }
  }

  async runMigrations(): Promise<void> {
    try {
      this.logger.log('🔄 Démarrage des migrations...');
      const migrations = await this.dataSource.runMigrations();
      if (migrations.length === 0) {
        this.logger.log('✅ Aucune nouvelle migration à exécuter');
      } else {
        this.logger.log(`✅ ${migrations.length} migration(s) exécutée(s) avec succès`);
        migrations.forEach(migration => {
          this.logger.log(`   - ${migration.name}`);
        });
      }
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'exécution des migrations:', error.message);
      throw error;
    }
  }

  async revertLastMigration(): Promise<void> {
    try {
      this.logger.log('↩️ Annulation de la dernière migration...');
      await this.dataSource.undoLastMigration();
      this.logger.log('✅ Dernière migration annulée avec succès');
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'annulation de la migration:', error.message);
      throw error;
    }
  }

  async getDatabaseStats(): Promise<any> {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      const dbType = this.configService.get('DB_TYPE');
      let stats: any = {};
      if (dbType === 'mysql') {
        const [dbSize] = await queryRunner.query(`
          SELECT 
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'DB Size (MB)'
          FROM information_schema.tables 
          WHERE table_schema = ?
        `, [this.configService.get('DB_DATABASE')]);
        const tableStats = await queryRunner.query(`
          SELECT 
            table_name,
            table_rows,
            ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
          FROM information_schema.tables 
          WHERE table_schema = ?
          ORDER BY (data_length + index_length) DESC
        `, [this.configService.get('DB_DATABASE')]);
        stats = {
          databaseSize: dbSize['DB Size (MB)'],
          tables: tableStats,
        };
      }
      await queryRunner.release();
      return stats;
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des statistiques:', error.message);
      return null;
    }
  }
} 