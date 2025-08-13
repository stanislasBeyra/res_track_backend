import { Controller, Post, Get, Put, Delete, Body, Param, Query, ParseIntPipe, ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRole } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('create/users')
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
