import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Ensures every request carries a companyId from the authenticated user
 * and injects it into request body / query for downstream use.
 */
@Injectable()
export class CompanyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.companyId) {
      throw new ForbiddenException('Company context is required');
    }

    // Inject companyId into body and query so services can use it transparently
    if (request.body && typeof request.body === 'object') {
      request.body.companyId = user.companyId;
    }
    if (request.query && typeof request.query === 'object') {
      request.query.companyId = user.companyId;
    }

    return true;
  }
}
