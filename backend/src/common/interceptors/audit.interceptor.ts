import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { DataSource } from 'typeorm';
import { AuditLogEntity } from '../../action/entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit state-changing operations
    if (['GET', 'OPTIONS', 'HEAD'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const repo = this.dataSource.getRepository(AuditLogEntity);
          const log = repo.create({
            companyId: user?.companyId || 'anonymous',
            userId: user?.id || 'anonymous',
            entityType: context.getClass().name,
            entityId: responseBody?.id || request.params?.id || null,
            actionPerformed: `${method} ${request.url}`,
            details: {
              body: request.body,
              params: request.params,
              duration: Date.now() - startTime,
            },
            ipAddress:
              request.headers['x-forwarded-for'] ||
              request.connection?.remoteAddress ||
              request.ip,
          });
          await repo.save(log);
        } catch {
          // Audit logging should never break the request
        }
      }),
    );
  }
}
