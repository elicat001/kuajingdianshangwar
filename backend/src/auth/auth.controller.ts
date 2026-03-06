import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Headers,
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

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
