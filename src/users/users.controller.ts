import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  ParseIntPipe, 
  ValidationPipe, 
  HttpException, 
  HttpStatus,
  UseGuards,
  Logger 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth, 
  ApiQuery, 
  ApiParam 
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/wt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

export class UserApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;

  constructor(success: boolean, message: string, data?: T, error?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Créer un nouvel utilisateur',
    description: 'Crée un nouvel utilisateur avec les informations fournies' 
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Utilisateur créé avec succès',
    type: UserResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Données invalides' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Utilisateur déjà existant' 
  })
  async createUser(@Body(ValidationPipe) createUserDto: CreateUserDto): Promise<UserApiResponse<UserResponseDto>> {
    try {
      this.logger.log(`Création d'un nouvel utilisateur: ${createUserDto.email}`);
      
      const user = await this.usersService.createUser(createUserDto);
      
      return new UserApiResponse(
        true,
        'Utilisateur créé avec succès',
        user,
      );
    } catch (error) {
      this.logger.error(`Erreur création utilisateur: ${error.message}`, error.stack);
      throw new HttpException(
        new UserApiResponse(false, 'Erreur lors de la création de l\'utilisateur', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Récupérer tous les utilisateurs',
    description: 'Retourne la liste de tous les utilisateurs, optionnellement filtrée par rôle' 
  })
  @ApiQuery({ 
    name: 'role', 
    enum: UserRole, 
    required: false, 
    description: 'Filtrer par rôle utilisateur' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste des utilisateurs récupérée avec succès',
    type: [UserResponseDto] 
  })
  async findAllUsers(@Query('role') role?: UserRole): Promise<UserApiResponse<UserResponseDto[]>> {
    try {
      this.logger.log('Récupération de la liste des utilisateurs');
      
      let users;
      if (role) {
        users = await this.usersService.findUsersByRole(role);
      } else {
        users = await this.usersService.findAllUsers();
      }
      
      return new UserApiResponse(
        true,
        `${users.length} utilisateurs récupérés avec succès`,
        users,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération utilisateurs: ${error.message}`, error.stack);
      throw new HttpException(
        new UserApiResponse(false, 'Erreur lors de la récupération des utilisateurs', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer un utilisateur par ID',
    description: 'Retourne les détails d\'un utilisateur spécifique' 
  })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur trouvé',
    type: UserResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async findUserById(@Param('id', ParseIntPipe) id: number): Promise<UserApiResponse<UserResponseDto>> {
    try {
      this.logger.log(`Récupération de l'utilisateur ID: ${id}`);
      
      const user = await this.usersService.findUserById(id);
      
      return new UserApiResponse(
        true,
        'Utilisateur récupéré avec succès',
        user,
      );
    } catch (error) {
      this.logger.error(`Erreur récupération utilisateur: ${error.message}`, error.stack);
      throw new HttpException(
        new UserApiResponse(false, 'Erreur lors de la récupération de l\'utilisateur', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Mettre à jour le statut d\'un utilisateur',
    description: 'Active ou désactive un utilisateur' 
  })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiResponse({ 
    status: 200, 
    description: 'Statut utilisateur mis à jour avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ): Promise<UserApiResponse<UserResponseDto>> {
    try {
      this.logger.log(`Mise à jour du statut utilisateur ID: ${id} vers ${isActive}`);
      
      const user = await this.usersService.updateUserStatus(id, isActive);
      
      return new UserApiResponse(
        true,
        'Statut de l\'utilisateur mis à jour avec succès',
        user,
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour statut utilisateur: ${error.message}`, error.stack);
      throw new HttpException(
        new UserApiResponse(false, 'Erreur lors de la mise à jour du statut', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Supprimer un utilisateur',
    description: 'Supprime définitivement un utilisateur' 
  })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur supprimé avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async deleteUser(@Param('id', ParseIntPipe) id: number): Promise<UserApiResponse<null>> {
    try {
      this.logger.log(`Suppression de l'utilisateur ID: ${id}`);
      
      await this.usersService.deleteUser(id);
      
      return new UserApiResponse(
        true,
        'Utilisateur supprimé avec succès',
        null,
      );
    } catch (error) {
      this.logger.error(`Erreur suppression utilisateur: ${error.message}`, error.stack);
      throw new HttpException(
        new UserApiResponse(false, 'Erreur lors de la suppression de l\'utilisateur', null, error.message),
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Add a findOne method that other services can use
  async findOne(id: number): Promise<UserResponseDto> {
    return await this.usersService.findUserById(id);
  }
}
