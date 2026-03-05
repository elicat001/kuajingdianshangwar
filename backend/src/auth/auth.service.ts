import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { CompanyEntity } from './entities/company.entity';
import { RegisterDto } from './dto/register.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UserRole } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
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

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;

    const roles = user.userRoles.map((ur) => ur.role.name);
    return { id: user.id, email: user.email, companyId: user.companyId, roles };
  }

  async login(user: any) {
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

    const passwordHash = await bcrypt.hash(dto.password, 10);

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

  async assignRole(dto: AssignRoleDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
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
