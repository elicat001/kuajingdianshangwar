import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionService } from './action.service';
import { ActionController } from './action.controller';
import { ActionEntity } from './entities/action.entity';
import { ApprovalEntity } from './entities/approval.entity';
import { ExecutionEntity } from './entities/execution.entity';
import { RollbackEntity } from './entities/rollback.entity';
import { AuditLogEntity } from './entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActionEntity,
      ApprovalEntity,
      ExecutionEntity,
      RollbackEntity,
      AuditLogEntity,
    ]),
  ],
  controllers: [ActionController],
  providers: [ActionService],
  exports: [ActionService],
})
export class ActionModule {}
