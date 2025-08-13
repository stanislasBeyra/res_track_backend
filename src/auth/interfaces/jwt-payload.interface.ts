import { UserRole } from "src/users/entities/user.entity";

export interface JwtPayload {
  sub: number; // User ID
  username: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
