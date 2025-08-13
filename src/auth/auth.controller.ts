import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  ValidationPipe,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Patch
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/wt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body(ValidationPipe) registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      this.logger.log(`Requête d'inscription pour: ${registerDto.email}`);
      return await this.authService.register(registerDto);
    } catch (error) {
      this.logger.error(`Erreur lors de l'inscription: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de l\'inscription',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      this.logger.log(`Requête de connexion pour: ${loginDto.identifier}`);
      return await this.authService.login(loginDto);
    } catch (error) {
      this.logger.error(`Erreur lors de la connexion: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la connexion',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string): Promise<AuthResponseDto> {
    try {
      this.logger.log('Requête de rafraîchissement de token');
      return await this.authService.refreshToken(refreshToken);
    } catch (error) {
      this.logger.error(`Erreur lors du rafraîchissement: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors du rafraîchissement',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Requête de déconnexion');
      return await this.authService.logout(refreshToken);
    } catch (error) {
      this.logger.error(`Erreur lors de la déconnexion: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la déconnexion',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: any): Promise<any> {
    try {
      this.logger.log(`Requête de profil pour l'utilisateur: ${user.id}`);
      return await this.authService.getProfile(user.id);
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du profil: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération du profil',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch('change-password')
  async changePassword(
    @CurrentUser() user: any,
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Requête de changement de mot de passe pour l'utilisateur: ${user.id}`);
      return await this.authService.changePassword(user.id, changePasswordDto);
    } catch (error) {
      this.logger.error(`Erreur lors du changement de mot de passe: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors du changement de mot de passe',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('verify')
  async verify(@CurrentUser() user: any): Promise<{ success: boolean; user: any }> {
    try {
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: user.profile,
        },
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la vérification',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Routes réservées aux administrateurs
  @Roles(UserRole.ADMIN)
  @Get('admin/stats')
  async getAuthStats(): Promise<any> {
    try {
      this.logger.log('Requête de statistiques d\'authentification (admin)');
      // Implémenter les statistiques d'auth
      return {
        success: true,
        message: 'Statistiques récupérées',
        data: {
          totalUsers: 0,
          activeUsers: 0,
          lastWeekLogins: 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des stats: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des statistiques',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}