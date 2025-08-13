import { UserRole } from '../entities/user.entity';
import { StudentStatus } from '../../students/entities/student.entity';

export class UserResponseDto {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  profile: {
    id: number;
    firstName: string;
    lastName: string;
    dateOfBirth?: Date;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    avatarUrl?: string;
  };

  student?: {
    id: number;
    studentNumber: string;
    class: string;
    status: StudentStatus;
    enrollmentDate: Date;
  };
} 