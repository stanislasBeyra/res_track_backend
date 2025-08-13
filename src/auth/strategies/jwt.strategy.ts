import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Type de token invalide');
    }

    try {
      const user = await this.usersService.findUserById(payload.sub);
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Utilisateur inactif ou non trouvé');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile
      };
    } catch (error) {
      throw new UnauthorizedException('Utilisateur non valide');
    }
  }
}