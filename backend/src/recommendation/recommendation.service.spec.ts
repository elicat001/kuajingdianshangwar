import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationEntity } from './entities/recommendation.entity';
import { RecommendationStatus, RiskLevel, ActionType } from '../common/enums';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/utils/mock-repository';
import { makeRecommendation } from '../../test/utils/test-helpers';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let recRepo: MockRepository;

  const COMPANY_ID = 'company-123';

  beforeEach(async () => {
    recRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: getRepositoryToken(RecommendationEntity), useValue: recRepo },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Query Recommendations ───────────────────────────────────

  describe('queryRecommendations', () => {
    it('should return paginated results filtered by SKU', async () => {
      const qb = createMockQueryBuilder();
      const recs = [makeRecommendation()];
      qb.getManyAndCount.mockResolvedValue([recs, 1]);
      recRepo.createQueryBuilder.mockReturnValue(qb);

      const query = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
        skuId: 'sku-1',
        get skip() { return 0; },
      };

      const result = await service.queryRecommendations(COMPANY_ID, query as any);

      expect(result.items).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'r.skuId = :skuId',
        { skuId: 'sku-1' },
      );
    });
  });

  // ─── Get By SKU ──────────────────────────────────────────────

  describe('getBySkuId', () => {
    it('should return recommendations for a SKU', async () => {
      const recs = [
        makeRecommendation({ skuId: 'sku-1', companyId: COMPANY_ID }),
      ];
      recRepo.find.mockResolvedValue(recs);

      const result = await service.getBySkuId(COMPANY_ID, 'sku-1');

      expect(result).toHaveLength(1);
      expect(recRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: COMPANY_ID, skuId: 'sku-1' },
        }),
      );
    });
  });

  // ─── Accept Recommendation ───────────────────────────────────

  describe('accept', () => {
    it('should change status from PENDING to ACCEPTED', async () => {
      const rec = makeRecommendation({
        id: 'rec-1',
        companyId: COMPANY_ID,
        status: RecommendationStatus.PENDING,
      });
      recRepo.findOne.mockResolvedValue(rec);
      recRepo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.accept(COMPANY_ID, 'rec-1');

      expect(result.status).toBe(RecommendationStatus.ACCEPTED);
    });

    it('should throw ConflictException if not PENDING', async () => {
      const rec = makeRecommendation({
        id: 'rec-1',
        companyId: COMPANY_ID,
        status: RecommendationStatus.ACCEPTED,
      });
      recRepo.findOne.mockResolvedValue(rec);

      await expect(service.accept(COMPANY_ID, 'rec-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if not found', async () => {
      recRepo.findOne.mockResolvedValue(null);

      await expect(service.accept(COMPANY_ID, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── Reject Recommendation ──────────────────────────────────

  describe('reject', () => {
    it('should change status from PENDING to REJECTED', async () => {
      const rec = makeRecommendation({
        id: 'rec-1',
        companyId: COMPANY_ID,
        status: RecommendationStatus.PENDING,
      });
      recRepo.findOne.mockResolvedValue(rec);
      recRepo.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.reject(COMPANY_ID, 'rec-1');

      expect(result.status).toBe(RecommendationStatus.REJECTED);
    });

    it('should throw ConflictException if already REJECTED', async () => {
      const rec = makeRecommendation({
        id: 'rec-1',
        companyId: COMPANY_ID,
        status: RecommendationStatus.REJECTED,
      });
      recRepo.findOne.mockResolvedValue(rec);

      await expect(service.reject(COMPANY_ID, 'rec-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
