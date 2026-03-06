import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { CompanyEntity } from './entities/company.entity';
import { RegisterDto } from './dto/register.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UserRole } from '../common/enums';
import { REDIS_CLIENT } from '../common/redis/redis.module';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 900; // 15 minutes
const TOKEN_BLACKLIST_PREFIX = 'bl:';
const LOGIN_ATTEMPTS_PREFIX = 'login_attempts:';

export interface ValidatedUser {
  id: string;
  email: string;
  companyId: string;
  roles: string[];
}

export interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    companyId: string;
    roles: string[];
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepo: Repository<CompanyEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<ValidatedUser | null> {
    // Check account lockout
    const attemptsKey = `${LOGIN_ATTEMPTS_PREFIX}${email}`;
    const attempts = await this.redis.get(attemptsKey);
    if (attempts && parseInt(attempts, 10) >= MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException(
        'Account temporarily locked due to too many failed login attempts. Try again later.',
      );
    }

    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) {
      await this.incrementLoginAttempts(email);
      return null;
    }

    if (!user.active) {
      throw new UnauthorizedException('Account is disabled');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await this.incrementLoginAttempts(email);
      return null;
    }

    // Reset attempts on successful login
    await this.redis.del(attemptsKey);

    const roles = user.userRoles.map((ur) => ur.role.name);
    return { id: user.id, email: user.email, companyId: user.companyId, roles };
  }

  private async incrementLoginAttempts(email: string): Promise<void> {
    const key = `${LOGIN_ATTEMPTS_PREFIX}${email}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, LOCKOUT_SECONDS);
    }
    if (current >= MAX_LOGIN_ATTEMPTS) {
      this.logger.warn(`Account locked: ${email} after ${current} failed attempts`);
    }
  }

  async login(user: ValidatedUser): Promise<LoginResult> {
    const payload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      roles: user.roles,
    };

    // Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        roles: user.roles,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Create or find company
    let company = await this.companyRepo.findOne({
      where: { name: dto.companyName },
    });
    if (!company) {
      company = this.companyRepo.create({ name: dto.companyName });
      company = await this.companyRepo.save(company);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      avatar: dto.avatar,
      companyId: company.id,
    });
    const savedUser = await this.userRepo.save(user);

    // Assign default OPERATOR role
    await this.assignRoleInternal(savedUser.id, UserRole.OPERATOR);

    const roles = [UserRole.OPERATOR];
    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      companyId: savedUser.companyId,
      roles,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: savedUser.id,
        email: savedUser.email,
        companyId: savedUser.companyId,
        roles,
      },
    };
  }

  async assignRole(dto: AssignRoleDto, currentUserCompanyId: string) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.companyId !== currentUserCompanyId) {
      throw new ForbiddenException('Cannot assign roles to users in other companies');
    }

    return this.assignRoleInternal(dto.userId, dto.role);
  }

  private async assignRoleInternal(userId: string, roleName: UserRole) {
    let role = await this.roleRepo.findOne({ where: { name: roleName } });
    if (!role) {
      role = this.roleRepo.create({ name: roleName, description: roleName });
      role = await this.roleRepo.save(role);
    }

    const existing = await this.userRoleRepo.findOne({
      where: { userId, roleId: role.id },
    });
    if (existing) return existing;

    const userRole = this.userRoleRepo.create({ userId, roleId: role.id });
    return this.userRoleRepo.save(userRole);
  }

  async logout(token: string): Promise<{ message: string }> {
    // Decode token to get expiry, then blacklist it for remaining TTL
    try {
      const decoded = this.jwtService.decode(token) as { exp?: number };
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.set(`${TOKEN_BLACKLIST_PREFIX}${token}`, '1', 'EX', ttl);
        }
      }
    } catch {
      // Token decode failure is non-critical for logout
    }
    return { message: 'Logged out successfully' };
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.redis.get(`${TOKEN_BLACKLIST_PREFIX}${token}`);
    return result !== null;
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role', 'company'],
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      companyId: user.companyId,
      companyName: user.company?.name,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
