import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { CompanyEntity } from './entities/company.entity';
import { UserRole } from '../common/enums';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import {
  createMockRepository,
  MockRepository,
} from '../../test/utils/mock-repository';

jest.mock('bcrypt');

const createMockRedis = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: MockRepository;
  let roleRepo: MockRepository;
  let userRoleRepo: MockRepository;
  let companyRepo: MockRepository;
  let jwtService: { sign: jest.Mock; decode: jest.Mock };
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(async () => {
    userRepo = createMockRepository();
    roleRepo = createMockRepository();
    userRoleRepo = createMockRepository();
    companyRepo = createMockRepository();
    jwtService = {
      sign: jest.fn().mockReturnValue('jwt-token-123'),
      decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };
    mockRedis = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(RoleEntity), useValue: roleRepo },
        { provide: getRepositoryToken(UserRoleEntity), useValue: userRoleRepo },
        { provide: getRepositoryToken(CompanyEntity), useValue: companyRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Registration ────────────────────────────────────────────

  describe('register', () => {
    const dto = {
      email: 'new@test.com',
      password: 'password123',
      displayName: 'New User',
      companyName: 'New Company',
    };

    it('should hash the password and create user + company', async () => {
      userRepo.findOne.mockResolvedValue(null); // no existing user
      companyRepo.findOne.mockResolvedValue(null); // no existing company
      companyRepo.create.mockReturnValue({ name: dto.companyName });
      companyRepo.save.mockResolvedValue({
        id: 'company-1',
        name: dto.companyName,
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      userRepo.create.mockReturnValue({
        email: dto.email,
        passwordHash: 'hashed-password',
        displayName: dto.displayName,
        companyId: 'company-1',
      });
      userRepo.save.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        passwordHash: 'hashed-password',
        displayName: dto.displayName,
        companyId: 'company-1',
      });

      // Role assignment mocks
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.create.mockReturnValue({
        name: UserRole.OPERATOR,
        description: UserRole.OPERATOR,
      });
      roleRepo.save.mockResolvedValue({
        id: 'role-1',
        name: UserRole.OPERATOR,
      });
      userRoleRepo.findOne.mockResolvedValue(null);
      userRoleRepo.create.mockReturnValue({
        userId: 'user-1',
        roleId: 'role-1',
      });
      userRoleRepo.save.mockResolvedValue({
        id: 'ur-1',
        userId: 'user-1',
        roleId: 'role-1',
      });

      const result = await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(companyRepo.save).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
      expect(result.accessToken).toBe('jwt-token-123');
      expect(result.user.email).toBe(dto.email);
      expect(result.user.roles).toContain(UserRole.OPERATOR);
    });

    it('should throw ConflictException if email already registered', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing', email: dto.email });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should use existing company when company name already exists', async () => {
      userRepo.findOne.mockResolvedValue(null);
      companyRepo.findOne.mockResolvedValue({
        id: 'existing-company',
        name: dto.companyName,
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      userRepo.create.mockReturnValue({
        email: dto.email,
        companyId: 'existing-company',
      });
      userRepo.save.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        companyId: 'existing-company',
      });

      roleRepo.findOne.mockResolvedValue({
        id: 'role-1',
        name: UserRole.OPERATOR,
      });
      userRoleRepo.findOne.mockResolvedValue(null);
      userRoleRepo.create.mockReturnValue({});
      userRoleRepo.save.mockResolvedValue({});

      const result = await service.register(dto);

      expect(companyRepo.create).not.toHaveBeenCalled();
      expect(result.user.companyId).toBe('existing-company');
    });
  });

  // ─── Login ───────────────────────────────────────────────────

  describe('validateUser + login', () => {
    it('should return JWT when password is valid', async () => {
      const user = {
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: 'hashed',
        companyId: 'company-1',
        active: true,
        userRoles: [{ role: { name: UserRole.OPERATOR } }],
      };
      userRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userRepo.update.mockResolvedValue({ affected: 1 });

      const validated = await service.validateUser('test@test.com', 'password');
      expect(validated).toBeTruthy();
      expect(validated!.roles).toContain(UserRole.OPERATOR);

      const result = await service.login(validated!);
      expect(result.accessToken).toBe('jwt-token-123');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          email: 'test@test.com',
          companyId: 'company-1',
        }),
      );
    });

    it('should return null when password is invalid', async () => {
      const user = {
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: 'hashed',
        companyId: 'company-1',
        active: true,
        userRoles: [],
      };
      userRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@test.com', 'wrong');
      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.validateUser('noone@test.com', 'password');
      expect(result).toBeNull();
    });

    it('should throw when account is locked', async () => {
      mockRedis.get.mockResolvedValue('5');

      await expect(
        service.validateUser('locked@test.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should increment failed attempts on wrong password', async () => {
      const user = {
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: 'hashed',
        companyId: 'company-1',
        active: true,
        userRoles: [],
      };
      userRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.validateUser('test@test.com', 'wrong');

      expect(mockRedis.incr).toHaveBeenCalledWith('login_attempts:test@test.com');
    });

    it('should reset attempts on successful login', async () => {
      const user = {
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: 'hashed',
        companyId: 'company-1',
        active: true,
        userRoles: [{ role: { name: UserRole.OPERATOR } }],
      };
      userRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.validateUser('test@test.com', 'password');

      expect(mockRedis.del).toHaveBeenCalledWith('login_attempts:test@test.com');
    });
  });

  // ─── Logout / Token Blacklist ──────────────────────────────────

  describe('logout', () => {
    it('should blacklist the token in Redis', async () => {
      await service.logout('some-jwt-token');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'bl:some-jwt-token',
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('should check if token is blacklisted', async () => {
      mockRedis.get.mockResolvedValue('1');

      const result = await service.isTokenBlacklisted('some-token');
      expect(result).toBe(true);
    });
  });

  // ─── Role Assignment ─────────────────────────────────────────

  describe('assignRole', () => {
    it('should assign a role to a user', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1', companyId: 'company-1' });
      roleRepo.findOne.mockResolvedValue({
        id: 'role-1',
        name: UserRole.MANAGER,
      });
      userRoleRepo.findOne.mockResolvedValue(null);
      userRoleRepo.create.mockReturnValue({
        userId: 'user-1',
        roleId: 'role-1',
      });
      userRoleRepo.save.mockResolvedValue({
        id: 'ur-1',
        userId: 'user-1',
        roleId: 'role-1',
      });

      const result = await service.assignRole({
        userId: 'user-1',
        role: UserRole.MANAGER,
      }, 'company-1');

      expect(userRoleRepo.save).toHaveBeenCalled();
    });

    it('should not duplicate existing role assignment', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1', companyId: 'company-1' });
      roleRepo.findOne.mockResolvedValue({
        id: 'role-1',
        name: UserRole.OPERATOR,
      });
      userRoleRepo.findOne.mockResolvedValue({
        id: 'existing',
        userId: 'user-1',
        roleId: 'role-1',
      });

      const result = await service.assignRole({
        userId: 'user-1',
        role: UserRole.OPERATOR,
      }, 'company-1');

      expect(userRoleRepo.create).not.toHaveBeenCalled();
    });
  });
});
