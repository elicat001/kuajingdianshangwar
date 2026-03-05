import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AlertService } from './alert.service';
import { AlertEntity } from './entities/alert.entity';
import { AlertType, Severity, AlertStatus } from '../common/enums';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/utils/mock-repository';
import { makeAlert } from '../../test/utils/test-helpers';

describe('AlertService', () => {
  let service: AlertService;
  let alertRepo: MockRepository;

  const COMPANY_ID = 'company-123';

  beforeEach(async () => {
    alertRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: getRepositoryToken(AlertEntity), useValue: alertRepo },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Create Alert (Idempotent) ───────────────────────────────

  describe('createAlert', () => {
    it('should create a new alert', async () => {
      const data = {
        type: AlertType.STOCKOUT,
        severity: Severity.HIGH,
        title: 'Stock Alert',
        message: 'Low stock',
        dedupeKey: 'unique-key-1',
        skuId: 'sku-1',
      };
      alertRepo.findOne.mockResolvedValue(null);
      const created = makeAlert({ ...data, companyId: COMPANY_ID });
      alertRepo.create.mockReturnValue(created);
      alertRepo.save.mockResolvedValue(created);

      const result = await service.createAlert(COMPANY_ID, data);

      expect(alertRepo.save).toHaveBeenCalled();
      expect(result.type).toBe(AlertType.STOCKOUT);
    });

    it('should return existing alert for same dedupeKey (idempotent)', async () => {
      const existing = makeAlert({
        companyId: COMPANY_ID,
        dedupeKey: 'dup-key',
      });
      alertRepo.findOne.mockResolvedValue(existing);

      const result = await service.createAlert(COMPANY_ID, {
        dedupeKey: 'dup-key',
        type: AlertType.STOCKOUT,
      });

      expect(alertRepo.save).not.toHaveBeenCalled();
      expect(result.id).toBe(existing.id);
    });

    it('should handle unique constraint violation gracefully', async () => {
      alertRepo.findOne
        .mockResolvedValueOnce(null) // first check
        .mockResolvedValueOnce(makeAlert({ dedupeKey: 'race-key' })); // after constraint error
      alertRepo.create.mockReturnValue({});
      alertRepo.save.mockRejectedValue({ code: '23505' });

      const result = await service.createAlert(COMPANY_ID, {
        dedupeKey: 'race-key',
        type: AlertType.ADS_WASTE,
      });

      expect(result.dedupeKey).toBe('race-key');
    });
  });

  // ─── Query Alerts ────────────────────────────────────────────

  describe('queryAlerts', () => {
    it('should return paginated results with filters', async () => {
      const qb = createMockQueryBuilder();
      const alerts = [makeAlert(), makeAlert()];
      qb.getManyAndCount.mockResolvedValue([alerts, 2]);
      alertRepo.createQueryBuilder.mockReturnValue(qb);

      const query = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
        type: AlertType.STOCKOUT,
        severity: Severity.HIGH,
        status: AlertStatus.OPEN,
        get skip() { return 0; },
      };

      const result = await service.queryAlerts(COMPANY_ID, query as any);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(qb.andWhere).toHaveBeenCalledTimes(3); // type, severity, status
    });
  });

  // ─── Acknowledge Alert ───────────────────────────────────────

  describe('acknowledgeAlert', () => {
    it('should change status from OPEN to ACKNOWLEDGED', async () => {
      const alert = makeAlert({
        id: 'alert-1',
        companyId: COMPANY_ID,
        status: AlertStatus.OPEN,
      });
      alertRepo.findOne.mockResolvedValue(alert);
      alertRepo.save.mockImplementation((a) => Promise.resolve(a));

      const result = await service.acknowledgeAlert(COMPANY_ID, 'alert-1');

      expect(result.status).toBe(AlertStatus.ACKNOWLEDGED);
    });

    it('should throw ConflictException if alert is not OPEN', async () => {
      const alert = makeAlert({
        id: 'alert-1',
        companyId: COMPANY_ID,
        status: AlertStatus.ACKNOWLEDGED,
      });
      alertRepo.findOne.mockResolvedValue(alert);

      await expect(
        service.acknowledgeAlert(COMPANY_ID, 'alert-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── Close Alert ─────────────────────────────────────────────

  describe('closeAlert', () => {
    it('should change status to CLOSED', async () => {
      const alert = makeAlert({
        id: 'alert-1',
        companyId: COMPANY_ID,
        status: AlertStatus.ACKNOWLEDGED,
      });
      alertRepo.findOne.mockResolvedValue(alert);
      alertRepo.save.mockImplementation((a) => Promise.resolve(a));

      const result = await service.closeAlert(COMPANY_ID, 'alert-1');

      expect(result.status).toBe(AlertStatus.CLOSED);
    });

    it('should throw ConflictException if already CLOSED', async () => {
      const alert = makeAlert({
        id: 'alert-1',
        companyId: COMPANY_ID,
        status: AlertStatus.CLOSED,
      });
      alertRepo.findOne.mockResolvedValue(alert);

      await expect(
        service.closeAlert(COMPANY_ID, 'alert-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if alert not found', async () => {
      alertRepo.findOne.mockResolvedValue(null);

      await expect(
        service.closeAlert(COMPANY_ID, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
