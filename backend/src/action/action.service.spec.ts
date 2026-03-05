import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ActionService } from './action.service';
import { ActionEntity } from './entities/action.entity';
import { ApprovalEntity } from './entities/approval.entity';
import { ExecutionEntity } from './entities/execution.entity';
import { RollbackEntity } from './entities/rollback.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { DataSource } from 'typeorm';
import { ActionType, ActionStatus } from '../common/enums';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/utils/mock-repository';
import { makeAction } from '../../test/utils/test-helpers';

describe('ActionService', () => {
  let service: ActionService;
  let actionRepo: MockRepository;
  let approvalRepo: MockRepository;
  let executionRepo: MockRepository;
  let rollbackRepo: MockRepository;
  let auditRepo: MockRepository;

  const COMPANY_ID = 'company-123';
  const USER_ID = 'user-123';

  beforeEach(async () => {
    actionRepo = createMockRepository();
    approvalRepo = createMockRepository();
    executionRepo = createMockRepository();
    rollbackRepo = createMockRepository();
    auditRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionService,
        { provide: getRepositoryToken(ActionEntity), useValue: actionRepo },
        { provide: getRepositoryToken(ApprovalEntity), useValue: approvalRepo },
        { provide: getRepositoryToken(ExecutionEntity), useValue: executionRepo },
        { provide: getRepositoryToken(RollbackEntity), useValue: rollbackRepo },
        { provide: getRepositoryToken(AuditLogEntity), useValue: auditRepo },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
                findOne: jest.fn(),
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ActionService>(ActionService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Create Action ──────────────────────────────────────────

  describe('createAction', () => {
    it('should create action from recommendation with DRAFT status', async () => {
      const dto = {
        type: ActionType.ADJUST_PRICE,
        recommendationId: 'rec-1',
        params: { newPrice: 24.99 },
        requiresApproval: true,
        skuId: 'sku-1',
      };
      const created = makeAction({ ...dto, companyId: COMPANY_ID, createdBy: USER_ID });
      actionRepo.create.mockReturnValue(created);
      actionRepo.save.mockResolvedValue(created);
      auditRepo.create.mockReturnValue({});
      auditRepo.save.mockResolvedValue({});

      const result = await service.createAction(COMPANY_ID, USER_ID, dto);

      expect(result.status).toBe(ActionStatus.DRAFT);
      expect(actionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ActionType.ADJUST_PRICE,
          status: ActionStatus.DRAFT,
          createdBy: USER_ID,
        }),
      );
    });
  });

  // ─── State Machine: Happy Path ───────────────────────────────

  describe('state machine - happy path', () => {
    it('draft -> submitted -> approved -> executed -> verified -> closed', async () => {
      const action = makeAction({
        id: 'action-1',
        companyId: COMPANY_ID,
        status: ActionStatus.DRAFT,
        requiresApproval: true,
      });
      actionRepo.findOne.mockResolvedValue(action);
      actionRepo.save.mockImplementation((a) => Promise.resolve({ ...a }));
      auditRepo.create.mockReturnValue({});
      auditRepo.save.mockResolvedValue({});
      approvalRepo.create.mockReturnValue({});
      approvalRepo.save.mockResolvedValue({});
      executionRepo.create.mockReturnValue({});
      executionRepo.save.mockResolvedValue({});

      // Submit
      const submitted = await service.submitAction(COMPANY_ID, USER_ID, 'action-1');
      expect(submitted.status).toBe(ActionStatus.SUBMITTED);

      // Approve
      action.status = ActionStatus.SUBMITTED;
      const approved = await service.approveAction(COMPANY_ID, USER_ID, 'action-1', {
        decision: 'approved',
        comment: 'Looks good',
      });
      expect(approved.status).toBe(ActionStatus.APPROVED);

      // Execute
      action.status = ActionStatus.APPROVED;
      const executed = await service.executeAction(COMPANY_ID, USER_ID, 'action-1', { success: true });
      expect(executed.status).toBe(ActionStatus.EXECUTED);

      // Verify
      action.status = ActionStatus.EXECUTED;
      const verified = await service.verifyAction(COMPANY_ID, USER_ID, 'action-1', {
        gain: 50,
        loss: 5,
      });
      expect(verified.status).toBe(ActionStatus.VERIFIED);

      // Close
      action.status = ActionStatus.VERIFIED;
      const closed = await service.closeAction(COMPANY_ID, USER_ID, 'action-1');
      expect(closed.status).toBe(ActionStatus.CLOSED);
    });
  });

  // ─── Rejection Flow ─────────────────────────────────────────

  describe('rejection flow: submitted -> rejected', () => {
    it('should reject a submitted action', async () => {
      const action = makeAction({
        id: 'action-1',
        companyId: COMPANY_ID,
        status: ActionStatus.SUBMITTED,
      });
      actionRepo.findOne.mockResolvedValue(action);
      actionRepo.save.mockImplementation((a) => Promise.resolve({ ...a }));
      approvalRepo.create.mockReturnValue({});
      approvalRepo.save.mockResolvedValue({});
      auditRepo.create.mockReturnValue({});
      auditRepo.save.mockResolvedValue({});

      const result = await service.approveAction(COMPANY_ID, USER_ID, 'action-1', {
        decision: 'rejected',
        comment: 'Too risky',
      });

      expect(result.status).toBe(ActionStatus.REJECTED);
    });
  });

  // ─── Execution Failed Flow ──────────────────────────────────

  describe('failure flow: executed -> executed_failed', () => {
    it('should mark executed action as failed', async () => {
      const action = makeAction({
        id: 'action-1',
        companyId: COMPANY_ID,
        status: ActionStatus.APPROVED,
      });
      actionRepo.findOne.mockResolvedValue(action);
      actionRepo.save.mockImplementation((a) => Promise.resolve({ ...a }));
      executionRepo.create.mockReturnValue({});
      executionRepo.save.mockResolvedValue({});
      auditRepo.create.mockReturnValue({});
      auditRepo.save.mockResolvedValue({});

      const result = await service.executeAction(
        COMPANY_ID,
        USER_ID,
        'action-1',
        undefined,
        'API timeout',
      );

      expect(result.status).toBe(ActionStatus.EXECUTED_FAILED);
    });
  });

  // ─── Rollback Flow ──────────────────────────────────────────

  describe('rollback flow: executed -> rolled_back', () => {
    it('should rollback an executed action', async () => {
      const action = makeAction({
        id: 'action-1',
        companyId: COMPANY_ID,
        status: ActionStatus.EXECUTED,
        params: { oldPrice: 29.99, newPrice: 24.99 },
      });
      actionRepo.findOne.mockResolvedValue(action);
      actionRepo.save.mockImplementation((a) => Promise.resolve({ ...a }));
      rollbackRepo.create.mockReturnValue({});
      rollbackRepo.save.mockResolvedValue({});
      auditRepo.create.mockReturnValue({});
      auditRepo.save.mockResolvedValue({});

      const result = await service.rollbackAction(COMPANY_ID, USER_ID, 'action-1', {
        restoredPrice: 29.99,
      });

      expect(result.status).toBe(ActionStatus.ROLLED_BACK);
      expect(rollbackRepo.save).toHaveBeenCalled();
    });
  });

  // ─── Invalid Transitions ────────────────────────────────────

  describe('invalid state transitions', () => {
    it('should reject DRAFT -> APPROVED (must go through SUBMITTED)', async () => {
      const action = makeAction({
        id: 'action-1',
        companyId: COMPANY_ID,
        status: ActionStatus.DRAFT,
      });
      actionRepo.findOne.mockResolvedValue(action);

      await expect(
        service.approveAction(COMPANY_ID, USER_ID, 'action-1', {
          decision: 'approved',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject CLOSED -> any transition', async () => {
      const action = makeAction({
        id: 'action-1',
        companyId: COMPANY_ID,
        status: ActionStatus.CLOSED,
      });
      actionRepo.findOne.mockResolvedValue(action);

      await expect(
        service.submitAction(COMPANY_ID, USER_ID, 'action-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject rollback on non-EXECUTED action', async () => {
      const action = makeAction({
        id: 'action-1',
        companyId: COMPANY_ID,
        status: ActionStatus.APPROVED,
      });
      actionRepo.findOne.mockResolvedValue(action);

      await expect(
        service.rollbackAction(COMPANY_ID, USER_ID, 'action-1', {}),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── Auto-approve (no approval required) ─────────────────────

  describe('auto-approve when requiresApproval is false', () => {
    it('should skip SUBMITTED and go directly to APPROVED', async () => {
      const action = makeAction({
        id: 'action-1',
        companyId: COMPANY_ID,
        status: ActionStatus.DRAFT,
        requiresApproval: false,
      });
      actionRepo.findOne.mockResolvedValue(action);
      actionRepo.save.mockImplementation((a) => Promise.resolve({ ...a }));
      auditRepo.create.mockReturnValue({});
      auditRepo.save.mockResolvedValue({});

      const result = await service.submitAction(COMPANY_ID, USER_ID, 'action-1');

      expect(result.status).toBe(ActionStatus.APPROVED);
    });
  });

  // ─── Not Found ──────────────────────────────────────────────

  describe('action not found', () => {
    it('should throw NotFoundException', async () => {
      actionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getActionById(COMPANY_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
