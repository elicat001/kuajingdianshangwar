import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ActionEntity } from './entities/action.entity';
import { ApprovalEntity } from './entities/approval.entity';
import { ExecutionEntity } from './entities/execution.entity';
import { RollbackEntity } from './entities/rollback.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { CreateActionDto } from './dto/create-action.dto';
import { QueryActionDto } from './dto/query-action.dto';
import { ApproveActionDto } from './dto/approve-action.dto';
import { ActionStatus } from '../common/enums';
import { PaginatedResult } from '../common/dto/pagination.dto';

/**
 * State machine transitions:
 * DRAFT -> SUBMITTED -> APPROVED/REJECTED -> EXECUTED/EXECUTED_FAILED -> VERIFIED -> CLOSED
 * EXECUTED -> ROLLED_BACK
 */
const VALID_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  [ActionStatus.DRAFT]: [ActionStatus.SUBMITTED],
  [ActionStatus.SUBMITTED]: [ActionStatus.APPROVED, ActionStatus.REJECTED],
  [ActionStatus.APPROVED]: [ActionStatus.EXECUTED, ActionStatus.EXECUTED_FAILED],
  [ActionStatus.REJECTED]: [ActionStatus.CLOSED],
  [ActionStatus.EXECUTED]: [ActionStatus.VERIFIED, ActionStatus.ROLLED_BACK, ActionStatus.EXECUTED_FAILED],
  [ActionStatus.EXECUTED_FAILED]: [ActionStatus.CLOSED, ActionStatus.SUBMITTED],
  [ActionStatus.VERIFIED]: [ActionStatus.CLOSED],
  [ActionStatus.ROLLED_BACK]: [ActionStatus.CLOSED],
  [ActionStatus.CLOSED]: [],
};

@Injectable()
export class ActionService {
  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepo: Repository<ActionEntity>,
    @InjectRepository(ApprovalEntity)
    private readonly approvalRepo: Repository<ApprovalEntity>,
    @InjectRepository(ExecutionEntity)
    private readonly executionRepo: Repository<ExecutionEntity>,
    @InjectRepository(RollbackEntity)
    private readonly rollbackRepo: Repository<RollbackEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createAction(companyId: string, userId: string, dto: CreateActionDto) {
    const action = this.actionRepo.create({
      ...dto,
      companyId,
      createdBy: userId,
      status: ActionStatus.DRAFT,
    });
    const saved = await this.actionRepo.save(action);
    await this.appendAudit(companyId, userId, 'Action', saved.id, 'CREATE');
    return saved;
  }

  async submitAction(companyId: string, userId: string, id: string) {
    const action = await this.findByIdOrThrow(companyId, id);
    this.assertTransition(action.status, ActionStatus.SUBMITTED);

    // If no approval required, auto-approve
    if (!action.requiresApproval) {
      action.status = ActionStatus.APPROVED;
    } else {
      action.status = ActionStatus.SUBMITTED;
    }
    const saved = await this.actionRepo.save(action);
    await this.appendAudit(companyId, userId, 'Action', id, 'SUBMIT');
    return saved;
  }

  async approveAction(
    companyId: string,
    userId: string,
    id: string,
    dto: ApproveActionDto,
  ) {
    const action = await this.findByIdOrThrow(companyId, id);
    const targetStatus =
      dto.decision === 'approved' ? ActionStatus.APPROVED : ActionStatus.REJECTED;
    this.assertTransition(action.status, targetStatus);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const approval = this.approvalRepo.create({
        actionId: id,
        companyId,
        approverUserId: userId,
        decision: dto.decision,
        comment: dto.comment,
        decidedAt: new Date(),
      });
      await queryRunner.manager.save(approval);

      action.status = targetStatus;
      const saved = await queryRunner.manager.save(action);
      await queryRunner.commitTransaction();
      await this.appendAudit(companyId, userId, 'Action', id, `APPROVE:${dto.decision}`);
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async executeAction(
    companyId: string,
    userId: string,
    id: string,
    result?: Record<string, any>,
    error?: string,
  ) {
    const action = await this.findByIdOrThrow(companyId, id);
    const targetStatus = error ? ActionStatus.EXECUTED_FAILED : ActionStatus.EXECUTED;
    this.assertTransition(action.status, targetStatus);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const execution = this.executionRepo.create({
        actionId: id,
        companyId,
        executedBy: userId,
        result,
        error,
        executedAt: new Date(),
      });
      await queryRunner.manager.save(execution);

      action.status = targetStatus;
      action.executedAt = new Date();
      const saved = await queryRunner.manager.save(action);
      await queryRunner.commitTransaction();
      await this.appendAudit(companyId, userId, 'Action', id, 'EXECUTE');
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async verifyAction(
    companyId: string,
    userId: string,
    id: string,
    verificationResult: Record<string, any>,
  ) {
    const action = await this.findByIdOrThrow(companyId, id);
    this.assertTransition(action.status, ActionStatus.VERIFIED);

    action.status = ActionStatus.VERIFIED;
    action.verificationResult = verificationResult;
    const saved = await this.actionRepo.save(action);
    await this.appendAudit(companyId, userId, 'Action', id, 'VERIFY');
    return saved;
  }

  async rollbackAction(
    companyId: string,
    userId: string,
    id: string,
    previousState: Record<string, any>,
  ) {
    const action = await this.findByIdOrThrow(companyId, id);
    this.assertTransition(action.status, ActionStatus.ROLLED_BACK);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const rollback = this.rollbackRepo.create({
        actionId: id,
        companyId,
        rolledBackBy: userId,
        previousState,
        rolledBackAt: new Date(),
      });
      await queryRunner.manager.save(rollback);

      action.status = ActionStatus.ROLLED_BACK;
      const saved = await queryRunner.manager.save(action);
      await queryRunner.commitTransaction();
      await this.appendAudit(companyId, userId, 'Action', id, 'ROLLBACK');
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async closeAction(companyId: string, userId: string, id: string) {
    const action = await this.findByIdOrThrow(companyId, id);
    this.assertTransition(action.status, ActionStatus.CLOSED);

    action.status = ActionStatus.CLOSED;
    const saved = await this.actionRepo.save(action);
    await this.appendAudit(companyId, userId, 'Action', id, 'CLOSE');
    return saved;
  }

  async queryActions(
    companyId: string,
    query: QueryActionDto,
  ): Promise<PaginatedResult<ActionEntity>> {
    const qb = this.actionRepo
      .createQueryBuilder('a')
      .where('a.companyId = :companyId', { companyId });

    if (query.type) qb.andWhere('a.type = :type', { type: query.type });
    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.skuId) qb.andWhere('a.skuId = :skuId', { skuId: query.skuId });
    if (query.storeId) qb.andWhere('a.storeId = :storeId', { storeId: query.storeId });
    if (query.createdBy) qb.andWhere('a.createdBy = :createdBy', { createdBy: query.createdBy });

    qb.orderBy('a.createdAt', 'DESC');

    const [items, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return new PaginatedResult(items, total, query.page, query.limit);
  }

  async getActionById(companyId: string, id: string) {
    const action = await this.actionRepo.findOne({
      where: { id, companyId },
      relations: ['approvals', 'executions', 'rollbacks'],
    });
    if (!action) throw new NotFoundException('Action not found');
    return action;
  }

  async getAuditLogs(companyId: string, entityId?: string) {
    const where: any = { companyId };
    if (entityId) where.entityId = entityId;
    return this.auditRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  private async findByIdOrThrow(companyId: string, id: string) {
    const action = await this.actionRepo.findOne({
      where: { id, companyId },
    });
    if (!action) throw new NotFoundException('Action not found');
    return action;
  }

  private assertTransition(current: ActionStatus, target: ActionStatus) {
    const allowed = VALID_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new ConflictException(
        `Invalid state transition: ${current} -> ${target}. Allowed: ${allowed.join(', ')}`,
      );
    }
  }

  private async appendAudit(
    companyId: string,
    userId: string,
    entityType: string,
    entityId: string,
    actionPerformed: string,
  ) {
    const log = this.auditRepo.create({
      companyId,
      userId,
      entityType,
      entityId,
      actionPerformed,
    });
    await this.auditRepo.save(log);
  }
}
