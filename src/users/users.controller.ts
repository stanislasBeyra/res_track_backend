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
  HttpStatus 
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

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('create/users')
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
  async createUser(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.createUser(createUserDto);
      return {
        success: true,
        message: 'Utilisateur créé avec succès',
        data: user,
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'An error occurred',
        error: error.message,
        data: null
      }, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/get/all/user')
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
  async findAllUsers(@Query('role') role?: UserRole) {
    try {
      let users;
      if (role) {
        users = await this.usersService.findUsersByRole(role);
      } else {
        users = await this.usersService.findAllUsers();
      }
      return {
        success: true,
        message: 'Liste des utilisateurs récupérée avec succès',
        data: users,
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'An error occurred',
        error: error.message,
        data: null
      },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Find user by id (id in body)
  @Post('/get/user/byid')
  @ApiOperation({ 
    summary: 'Récupérer un utilisateur par ID',
    description: 'Retourne les détails d\'un utilisateur spécifique' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur trouvé',
    type: UserResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async findUserById(@Body('id', ParseIntPipe) id: number) {
    try {
      const user = await this.usersService.findUserById(id);
      return {
        success: true,
        message: 'Utilisateur récupéré avec succès',
        data: user,
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'An error occurred',
        error: error.message,
        data: null
      }, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update user status (id in body)
  @Put('/update/users/status')
  @ApiOperation({ 
    summary: 'Mettre à jour le statut d\'un utilisateur',
    description: 'Active ou désactive un utilisateur' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Statut utilisateur mis à jour avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async updateUserStatus(
    @Body('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    try {
      const user = await this.usersService.updateUserStatus(id, isActive);
      return {
        success: true,
        message: 'Statut de l\'utilisateur mis à jour avec succès',
        data: user,
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'An error occurred',
        error: error.message,
        data: null
      }, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Delete user (id in body)
  @Delete('/delete/uers')
  @ApiOperation({ 
    summary: 'Supprimer un utilisateur',
    description: 'Supprime définitivement un utilisateur' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Utilisateur supprimé avec succès' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Utilisateur non trouvé' 
  })
  async deleteUser(@Body('id', ParseIntPipe) id: number) {
    try {
      await this.usersService.deleteUser(id);
      return {
        success: true,
        message: 'Utilisateur supprimé avec succès',
        data: null,
      };
    } catch (error) {
      throw new HttpException({
        success: false,
        message: 'An error occurred',
        error: error.message,
        data: null
      }, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
