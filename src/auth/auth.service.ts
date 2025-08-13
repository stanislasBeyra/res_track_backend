import { 
  Injectable, 
  UnauthorizedException, 
  BadRequestException, 
  ConflictException,
  Logger,
  InternalServerErrorException 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as bcrypt from 'bcryptjs';
import { UserRole } from 'src/users/entities/user.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokens = new Map<string, { userId: number; expiresAt: Date }>();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    // Nettoyer les tokens expirés toutes les heures
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      this.logger.log(`Tentative d'inscription pour: ${registerDto.email}`);

      if (!registerDto.role) {
        throw new BadRequestException('Role is required');
      }

      // Créer l'utilisateur via le service users
      const user = await this.usersService.createUser({
        username: registerDto.username,
        email: registerDto.email,
        password: registerDto.password,
        role: registerDto.role ?? UserRole.STUDENT, // <-- fix here
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });

      // Créer notification de bienvenue
      try {
        await this.notificationsService.createWelcomeNotification(user.id);
      } catch (notifError) {
        this.logger.warn(`Erreur lors de la création de la notification de bienvenue: ${notifError.message}`);
      }

      // Générer les tokens
      const tokens = await this.generateTokens(user);

      this.logger.log(`Inscription réussie pour l'utilisateur: ${user.id}`);

      return {
        success: true,
        message: 'Inscription réussie',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          profile: {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            avatarUrl: user.profile.avatarUrl,
          },
        },
        tokens,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Erreur lors de l'inscription: ${error.message}`, error.stack);
      
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erreur lors de l\'inscription');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      this.logger.log(`Tentative de connexion pour: ${loginDto.identifier}`);

      // Trouver l'utilisateur par email ou username
      const user = await this.findUserByIdentifier(loginDto.identifier);

      if (!user) {
        this.logger.warn(`Utilisateur non trouvé: ${loginDto.identifier}`);
        throw new UnauthorizedException('Identifiants invalides');
      }

      if (!user.isActive) {
        this.logger.warn(`Tentative de connexion d'un compte inactif: ${user.id}`);
        throw new UnauthorizedException('Compte désactivé');
      }

      // Vérifier le mot de passe
      const isPasswordValid = await this.validatePassword(loginDto.password, user.passwordHash);
      
      if (!isPasswordValid) {
        this.logger.warn(`Mot de passe invalide pour l'utilisateur: ${user.id}`);
        throw new UnauthorizedException('Identifiants invalides');
      }

      // Générer les tokens
      const tokens = await this.generateTokens(user, loginDto.rememberMe);

      this.logger.log(`Connexion réussie pour l'utilisateur: ${user.id}`);

      return {
        success: true,
        message: 'Connexion réussie',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          profile: {
            firstName: user.profile?.firstName || '',
            lastName: user.profile?.lastName || '',
            avatarUrl: user.profile?.avatarUrl,
          },
        },
        tokens,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la connexion: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erreur lors de la connexion');
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      this.logger.log('Tentative de rafraîchissement de token');

      // Vérifier le refresh token
      const tokenData = this.refreshTokens.get(refreshToken);
      
      if (!tokenData || new Date() > tokenData.expiresAt) {
        this.logger.warn('Refresh token invalide ou expiré');
        this.refreshTokens.delete(refreshToken);
        throw new UnauthorizedException('Refresh token invalide ou expiré');
      }

      // Récupérer l'utilisateur
      const user = await this.usersService.findUserById(tokenData.userId);
      
      if (!user || !user.isActive) {
        this.logger.warn(`Utilisateur inactif ou non trouvé lors du refresh: ${tokenData.userId}`);
        throw new UnauthorizedException('Utilisateur inactif ou non trouvé');
      }

      // Supprimer l'ancien refresh token
      this.refreshTokens.delete(refreshToken);

      // Générer de nouveaux tokens
      const tokens = await this.generateTokens(user);

      this.logger.log(`Token rafraîchi avec succès pour l'utilisateur: ${user.id}`);

      return {
        success: true,
        message: 'Token rafraîchi avec succès',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          profile: {
            firstName: user.profile?.firstName || '',
            lastName: user.profile?.lastName || '',
            avatarUrl: user.profile?.avatarUrl,
          },
        },
        tokens,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Erreur lors du rafraîchissement: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erreur lors du rafraîchissement du token');
    }
  }

  async logout(refreshToken: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Tentative de déconnexion');
      
      if (refreshToken) {
        this.refreshTokens.delete(refreshToken);
        this.logger.debug('Refresh token supprimé');
      }

      return {
        success: true,
        message: 'Déconnexion réussie'
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la déconnexion: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la déconnexion');
    }
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Changement de mot de passe pour l'utilisateur: ${userId}`);

      const user = await this.usersService.findUserEntityById(userId); // returns User entity with passwordHash
      
      if (!user) {
        throw new BadRequestException('Utilisateur non trouvé');
      }

      // Vérifier l'ancien mot de passe
      const isCurrentPasswordValid = await this.validatePassword(
        changePasswordDto.currentPassword, 
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        this.logger.warn(`Mot de passe actuel invalide pour l'utilisateur: ${userId}`);
        throw new UnauthorizedException('Mot de passe actuel invalide');
      }

      // Mettre à jour le mot de passe
      const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 12);
      await this.usersService.updateUser(userId, { passwordHash: newPasswordHash });

      this.logger.log(`Mot de passe changé avec succès pour l'utilisateur: ${userId}`);

      return {
        success: true,
        message: 'Mot de passe changé avec succès'
      };
    } catch (error) {
      this.logger.error(`Erreur lors du changement de mot de passe: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erreur lors du changement de mot de passe');
    }
  }

  async getProfile(userId: number): Promise<any> {
    try {
      this.logger.log(`Récupération du profil pour l'utilisateur: ${userId}`);
      
      const user = await this.usersService.findUserById(userId);
      
      if (!user) {
        throw new BadRequestException('Utilisateur non trouvé');
      }

      return {
        success: true,
        message: 'Profil récupéré avec succès',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          profile: user.profile,
          student: user.student,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du profil: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Erreur lors de la récupération du profil');
    }
  }

  // Méthodes privées
  private async findUserByIdentifier(identifier: string): Promise<any> {
    // Essayer de trouver par email d'abord
    if (identifier.includes('@')) {
      return await this.usersService.findByEmail(identifier);
    }
    
    // Sinon chercher par username
    return await this.usersService.findByUsername(identifier);
  }

  private async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  private async generateTokens(user: any, rememberMe: boolean = false): Promise<any> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      type: 'refresh',
    };

    const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshTokenExpiresIn = rememberMe ? '30d' : '7d';

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: accessTokenExpiresIn,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: refreshTokenExpiresIn,
    });

    // Stocker le refresh token
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + (rememberMe ? 30 : 7));
    
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: refreshExpiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes en secondes
    };
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.refreshTokens.entries()) {
      if (now > data.expiresAt) {
        this.refreshTokens.delete(token);
      }
    }
    this.logger.debug('Nettoyage des tokens expirés effectué');
  }
}