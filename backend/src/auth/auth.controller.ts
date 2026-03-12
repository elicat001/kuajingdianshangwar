import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  Headers,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  @Throttle({ short: { ttl: 60000, limit: 5 }, medium: { ttl: 900000, limit: 15 } })
  @ApiOperation({ summary: 'User login' })
  async login(@Request() req, @Body() _dto: LoginDto) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @Throttle({ short: { ttl: 60000, limit: 3 }, medium: { ttl: 3600000, limit: 5 } })
  @ApiOperation({ summary: 'User registration' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  async profile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'User logout — blacklists current token' })
  async logout(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '') || '';
    return this.authService.logout(token);
  }

  @Post('assign-role')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign role to user (Admin only)' })
  async assignRole(
    @Body() dto: AssignRoleDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.authService.assignRole(dto, companyId);
  }

  @Get('users')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List company users (Admin only)' })
  async getCompanyUsers(@CurrentUser('companyId') companyId: string) {
    return this.authService.getCompanyUsers(companyId);
  }

  @Post('users/:id/toggle-active')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Toggle user active status (Admin only)' })
  async toggleUserActive(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.authService.toggleUserActive(id, companyId);
  }

  @Get('users/:id/effective-permissions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get effective page permissions for a user' })
  async getEffectivePermissions(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.authService.getEffectivePermissions(id, companyId);
  }

  @Patch('users/:id/permissions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user permission overrides (Admin only)' })
  async updateUserPermissions(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: { overrides: Record<string, boolean> },
  ) {
    return this.authService.updateUserPermissions(id, companyId, body.overrides);
  }

  @Patch('users/:id/department')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user department (Admin only)' })
  async updateUserDepartment(
    @Param('id') id: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: { department: string },
  ) {
    return this.authService.updateUserDepartment(id, companyId, body.department);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
