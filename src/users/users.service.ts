import { Injectable, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { Student, StudentStatus } from '../students/entities/student.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    private dataSource: DataSource,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.checkUserExists(createUserDto.email, createUserDto.username);
        const user = await this.createUserEntity(createUserDto, manager);
        const profile = await this.createProfileEntity(createUserDto, user.id, manager);
        let student: Student | null = null;
        if (createUserDto.role === UserRole.STUDENT) {
          student = await this.createStudentEntity(createUserDto, user.id, manager);
        }
        return this.formatUserResponse(user, profile, student ?? undefined);
      });
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la création de l\'utilisateur');
    }
  }

  private async checkUserExists(email: string, username: string): Promise<void> {
    const existingUserByEmail = await this.usersRepository.findOne({ where: { email } });
    if (existingUserByEmail) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }
    const existingUserByUsername = await this.usersRepository.findOne({ where: { username } });
    if (existingUserByUsername) {
      throw new ConflictException('Un utilisateur avec ce nom d\'utilisateur existe déjà');
    }
  }

  private async createUserEntity(createUserDto: CreateUserDto, manager: any): Promise<User> {
    const passwordHash = await bcrypt.hash(createUserDto.password, 12);
    const user = manager.create(User, {
      username: createUserDto.username,
      email: createUserDto.email,
      passwordHash,
      role: createUserDto.role,
      isActive: createUserDto.isActive ?? true,
    });
    return await manager.save(User, user);
  }

  private async createProfileEntity(createUserDto: CreateUserDto, userId: number, manager: any): Promise<Profile> {
    const profile = manager.create(Profile, {
      userId,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      dateOfBirth: createUserDto.dateOfBirth ? new Date(createUserDto.dateOfBirth) : null,
      phone: createUserDto.phone,
      address: createUserDto.address,
      city: createUserDto.city,
      postalCode: createUserDto.postalCode,
      country: createUserDto.country,
    });
    return await manager.save(Profile, profile);
  }

  private async createStudentEntity(createUserDto: CreateUserDto, userId: number, manager: any): Promise<Student> {
    let studentNumber = createUserDto.studentNumber;
    if (!studentNumber) {
      studentNumber = await this.generateStudentNumber();
    } else {
      const existingStudent = await this.studentsRepository.findOne({ where: { studentNumber } });
      if (existingStudent) {
        throw new ConflictException('Ce numéro étudiant existe déjà');
      }
    }
    const student = manager.create(Student, {
      userId,
      studentNumber,
      class: createUserDto.class || 'NON_ASSIGNÉ',
      status: StudentStatus.ACTIVE,
      enrollmentDate: createUserDto.enrollmentDate ? new Date(createUserDto.enrollmentDate) : new Date(),
    });
    return await manager.save(Student, student);
  }

  private async generateStudentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `STU${year}`;
    const lastStudent = await this.studentsRepository
      .createQueryBuilder('student')
      .where('student.studentNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('student.studentNumber', 'DESC')
      .getOne();
    let nextNumber = 1;
    if (lastStudent) {
      const lastNumber = parseInt(lastStudent.studentNumber.replace(prefix, ''));
      nextNumber = lastNumber + 1;
    }
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  private formatUserResponse(user: User, profile: Profile, student?: Student | null): UserResponseDto {
    const response: UserResponseDto = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: profile.dateOfBirth,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        postalCode: profile.postalCode,
        country: profile.country,
        avatarUrl: profile.avatarUrl,
      },
    };
    if (student) {
      response.student = {
        id: student.id,
        studentNumber: student.studentNumber,
        class: student.class,
        status: student.status,
        enrollmentDate: student.enrollmentDate,
      };
    }
    return response;
  }

  async findUserById(id: number): Promise<UserResponseDto> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id },
        relations: ['profile', 'student'],
      });
      if (!user) {
        throw new BadRequestException('Utilisateur non trouvé');
      }
      return this.formatUserResponse(user, user.profile, user.student);
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la récupération de l\'utilisateur');
    }
  }

  async findAllUsers(): Promise<UserResponseDto[]> {
    try {
      const users = await this.usersRepository.find({
        relations: ['profile', 'student'],
        order: { createdAt: 'DESC' },
      });
      return users.map(user => this.formatUserResponse(user, user.profile, user.student));
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la récupération des utilisateurs');
    }
  }

  async findUsersByRole(role: UserRole): Promise<UserResponseDto[]> {
    try {
      const users = await this.usersRepository.find({
        where: { role },
        relations: ['profile', 'student'],
        order: { createdAt: 'DESC' },
      });
      return users.map(user => this.formatUserResponse(user, user.profile, user.student));
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la récupération des utilisateurs par rôle');
    }
  }

  async updateUserStatus(id: number, isActive: boolean): Promise<UserResponseDto> {
    try {
      await this.usersRepository.update(id, { isActive });
      return await this.findUserById(id);
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la mise à jour du statut de l\'utilisateur');
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user) {
        throw new BadRequestException('Utilisateur non trouvé');
      }
      await this.usersRepository.delete(id);
    } catch (error) {
      throw new InternalServerErrorException('Erreur lors de la suppression de l\'utilisateur');
    }
  }

  // Returns the User entity (with passwordHash)
  async findUserEntityById(id: number): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({ where: { id } });
    return user || undefined;
  }

  // Partial update of user (e.g., passwordHash)
  async updateUser(id: number, update: Partial<User>): Promise<void> {
    await this.usersRepository.update(id, update);
  }

  // Find user by email (returns User entity)
  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return user || undefined;
  }

  // Find user by username (returns User entity)
  async findByUsername(username: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({ where: { username } });
    return user || undefined;
  }
}
