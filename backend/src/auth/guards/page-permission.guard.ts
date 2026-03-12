import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { PAGE_PERMISSION_KEY } from '../decorators/page-permission.decorator';

@Injectable()
export class PagePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPage = this.reflector.getAllAndOverride<string>(
      PAGE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPage) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.id || !user.companyId) {
      throw new ForbiddenException('Insufficient permissions: user not found');
    }

    const effectivePermissions = await this.authService.getEffectivePermissions(
      user.id,
      user.companyId,
    );

    if (!effectivePermissions.includes(requiredPage)) {
      throw new ForbiddenException(
        `Insufficient permissions: page '${requiredPage}' access denied`,
      );
    }

    return true;
  }
}
