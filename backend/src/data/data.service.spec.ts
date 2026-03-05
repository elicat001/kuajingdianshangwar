import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataService } from './data.service';
import { StoreEntity } from './entities/store.entity';
import { SiteEntity } from './entities/site.entity';
import { StoreSiteBindingEntity } from './entities/store-site-binding.entity';
import { SkuMasterEntity } from './entities/sku-master.entity';
import { CompetitorEntity } from './entities/competitor.entity';
import { CompetitorSnapshotEntity } from './entities/competitor-snapshot.entity';
import { MetricDefEntity } from './entities/metric-def.entity';
import { MetricDefVersionEntity } from './entities/metric-def-version.entity';
import { ConfigThresholdEntity } from './entities/config-threshold.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/utils/mock-repository';
import {
  makeStore,
  makeSite,
  makeSku,
  makeCompetitor,
  makeThreshold,
  makeMetricDef,
  makeMetricDefVersion,
} from '../../test/utils/test-helpers';

describe('DataService', () => {
  let service: DataService;
  let storeRepo: MockRepository;
  let siteRepo: MockRepository;
  let bindingRepo: MockRepository;
  let skuRepo: MockRepository;
  let competitorRepo: MockRepository;
  let snapshotRepo: MockRepository;
  let metricDefRepo: MockRepository;
  let metricVersionRepo: MockRepository;
  let thresholdRepo: MockRepository;

  const COMPANY_ID = 'company-123';

  beforeEach(async () => {
    storeRepo = createMockRepository();
    siteRepo = createMockRepository();
    bindingRepo = createMockRepository();
    skuRepo = createMockRepository();
    competitorRepo = createMockRepository();
    snapshotRepo = createMockRepository();
    metricDefRepo = createMockRepository();
    metricVersionRepo = createMockRepository();
    thresholdRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataService,
        { provide: getRepositoryToken(StoreEntity), useValue: storeRepo },
        { provide: getRepositoryToken(SiteEntity), useValue: siteRepo },
        { provide: getRepositoryToken(StoreSiteBindingEntity), useValue: bindingRepo },
        { provide: getRepositoryToken(SkuMasterEntity), useValue: skuRepo },
        { provide: getRepositoryToken(CompetitorEntity), useValue: competitorRepo },
        { provide: getRepositoryToken(CompetitorSnapshotEntity), useValue: snapshotRepo },
        { provide: getRepositoryToken(MetricDefEntity), useValue: metricDefRepo },
        { provide: getRepositoryToken(MetricDefVersionEntity), useValue: metricVersionRepo },
        { provide: getRepositoryToken(ConfigThresholdEntity), useValue: thresholdRepo },
      ],
    }).compile();

    service = module.get<DataService>(DataService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Store CRUD ──────────────────────────────────────────────

  describe('Store CRUD', () => {
    it('should create a store with companyId', async () => {
      const dto = { name: 'My Store', platform: 'AMAZON' };
      const expected = makeStore({ ...dto, companyId: COMPANY_ID });
      storeRepo.create.mockReturnValue(expected);
      storeRepo.save.mockResolvedValue(expected);

      const result = await service.createStore(COMPANY_ID, dto);

      expect(storeRepo.create).toHaveBeenCalledWith({ ...dto, companyId: COMPANY_ID });
      expect(result.name).toBe('My Store');
    });

    it('should list stores for company', async () => {
      const stores = [makeStore({ companyId: COMPANY_ID })];
      storeRepo.find.mockResolvedValue(stores);

      const result = await service.getStores(COMPANY_ID);

      expect(result).toHaveLength(1);
      expect(storeRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID },
        relations: ['siteBindings'],
      });
    });

    it('should get store by id or throw', async () => {
      storeRepo.findOne.mockResolvedValue(null);

      await expect(service.getStoreById(COMPANY_ID, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── Site CRUD ───────────────────────────────────────────────

  describe('Site CRUD', () => {
    it('should create a site', async () => {
      const dto = {
        name: 'Amazon US',
        marketplaceCode: 'US',
        region: 'North America',
        currency: 'USD',
      };
      const expected = makeSite({ ...dto, companyId: COMPANY_ID });
      siteRepo.create.mockReturnValue(expected);
      siteRepo.save.mockResolvedValue(expected);

      const result = await service.createSite(COMPANY_ID, dto);

      expect(siteRepo.create).toHaveBeenCalledWith({ ...dto, companyId: COMPANY_ID });
      expect(result.marketplaceCode).toBe('US');
    });

    it('should list sites for company', async () => {
      siteRepo.find.mockResolvedValue([makeSite()]);
      const result = await service.getSites(COMPANY_ID);
      expect(result).toHaveLength(1);
    });
  });

  // ─── SKU CRUD & Pagination ───────────────────────────────────

  describe('SKU creation and query', () => {
    it('should create a SKU', async () => {
      const dto = {
        sku: 'SKU-001',
        title: 'Widget',
        storeId: 'store-1',
        price: 19.99,
      };
      const expected = makeSku({ ...dto, companyId: COMPANY_ID });
      skuRepo.create.mockReturnValue(expected);
      skuRepo.save.mockResolvedValue(expected);

      const result = await service.createSku(COMPANY_ID, dto);

      expect(result.sku).toBe('SKU-001');
    });

    it('should support paginated query with filters', async () => {
      const qb = createMockQueryBuilder();
      const items = [makeSku(), makeSku()];
      qb.getManyAndCount.mockResolvedValue([items, 2]);
      skuRepo.createQueryBuilder.mockReturnValue(qb);

      const query = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as const,
        storeId: 'store-1',
        keyword: 'widget',
        get skip() { return (this.page - 1) * this.limit; },
      };

      const result = await service.querySkus(COMPANY_ID, query as any);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(qb.where).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalledTimes(2); // storeId + keyword
    });

    it('should sort by allowed fields only', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      skuRepo.createQueryBuilder.mockReturnValue(qb);

      const query = {
        page: 1,
        limit: 20,
        sortBy: 'malicious_field',
        sortOrder: 'ASC' as const,
        get skip() { return 0; },
      };

      await service.querySkus(COMPANY_ID, query as any);

      // Should fallback to 'createdAt' since 'malicious_field' is not allowed
      expect(qb.orderBy).toHaveBeenCalledWith('sku.createdAt', 'ASC');
    });
  });

  // ─── Competitor ──────────────────────────────────────────────

  describe('Competitor', () => {
    it('should create a competitor', async () => {
      const dto = { name: 'Rival', platform: 'AMAZON', asin: 'B123' };
      const expected = makeCompetitor({ ...dto, companyId: COMPANY_ID });
      competitorRepo.create.mockReturnValue(expected);
      competitorRepo.save.mockResolvedValue(expected);

      const result = await service.createCompetitor(COMPANY_ID, dto);
      expect(result.name).toBe('Rival');
    });
  });

  // ─── Threshold ───────────────────────────────────────────────

  describe('Threshold upsert', () => {
    it('should create threshold when none exists', async () => {
      thresholdRepo.findOne.mockResolvedValue(null);
      const dto = { metricCode: 'daysOfCover', warnValue: 7, criticalValue: 3 };
      const expected = makeThreshold({ ...dto, companyId: COMPANY_ID });
      thresholdRepo.create.mockReturnValue(expected);
      thresholdRepo.save.mockResolvedValue(expected);

      const result = await service.upsertThreshold(COMPANY_ID, dto);
      expect(thresholdRepo.create).toHaveBeenCalled();
    });

    it('should update existing threshold', async () => {
      const existing = makeThreshold({
        companyId: COMPANY_ID,
        metricCode: 'daysOfCover',
        warnValue: 10,
        criticalValue: 5,
      });
      thresholdRepo.findOne.mockResolvedValue(existing);
      thresholdRepo.save.mockResolvedValue({
        ...existing,
        warnValue: 7,
        criticalValue: 3,
      });

      const dto = { metricCode: 'daysOfCover', warnValue: 7, criticalValue: 3 };
      const result = await service.upsertThreshold(COMPANY_ID, dto);

      expect(thresholdRepo.create).not.toHaveBeenCalled();
      expect(thresholdRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ warnValue: 7 }),
      );
    });
  });

  // ─── Metric Def Version ──────────────────────────────────────

  describe('Metric definition version management', () => {
    it('should create first version with version number 1', async () => {
      metricVersionRepo.findOne.mockResolvedValue(null); // no existing version
      const versionData = makeMetricDefVersion({
        companyId: COMPANY_ID,
        version: 1,
      });
      metricVersionRepo.create.mockReturnValue(versionData);
      metricVersionRepo.save.mockResolvedValue(versionData);

      const result = await service.createMetricDefVersion(
        COMPANY_ID,
        'metric-1',
        'new_formula',
        'Initial version',
      );

      expect(metricVersionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ version: 1, isActive: true }),
      );
    });

    it('should increment version and deactivate old ones', async () => {
      const latestVersion = makeMetricDefVersion({
        companyId: COMPANY_ID,
        version: 2,
        isActive: true,
      });
      metricVersionRepo.findOne.mockResolvedValue(latestVersion);
      metricVersionRepo.update.mockResolvedValue({ affected: 1 });

      const newVersionData = makeMetricDefVersion({
        companyId: COMPANY_ID,
        version: 3,
      });
      metricVersionRepo.create.mockReturnValue(newVersionData);
      metricVersionRepo.save.mockResolvedValue(newVersionData);

      await service.createMetricDefVersion(
        COMPANY_ID,
        'metric-1',
        'updated_formula',
        'Updated version',
      );

      expect(metricVersionRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
        expect.objectContaining({ isActive: false }),
      );
      expect(metricVersionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ version: 3 }),
      );
    });
  });
});
