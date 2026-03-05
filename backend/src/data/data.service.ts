import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreEntity } from './entities/store.entity';
import { SiteEntity } from './entities/site.entity';
import { StoreSiteBindingEntity } from './entities/store-site-binding.entity';
import { SkuMasterEntity } from './entities/sku-master.entity';
import { CompetitorEntity } from './entities/competitor.entity';
import { CompetitorSnapshotEntity } from './entities/competitor-snapshot.entity';
import { MetricDefEntity } from './entities/metric-def.entity';
import { MetricDefVersionEntity } from './entities/metric-def-version.entity';
import { ConfigThresholdEntity } from './entities/config-threshold.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { CreateSkuDto } from './dto/create-sku.dto';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { QuerySkuDto } from './dto/query-sku.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class DataService {
  constructor(
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    @InjectRepository(SiteEntity)
    private readonly siteRepo: Repository<SiteEntity>,
    @InjectRepository(StoreSiteBindingEntity)
    private readonly bindingRepo: Repository<StoreSiteBindingEntity>,
    @InjectRepository(SkuMasterEntity)
    private readonly skuRepo: Repository<SkuMasterEntity>,
    @InjectRepository(CompetitorEntity)
    private readonly competitorRepo: Repository<CompetitorEntity>,
    @InjectRepository(CompetitorSnapshotEntity)
    private readonly snapshotRepo: Repository<CompetitorSnapshotEntity>,
    @InjectRepository(MetricDefEntity)
    private readonly metricDefRepo: Repository<MetricDefEntity>,
    @InjectRepository(MetricDefVersionEntity)
    private readonly metricVersionRepo: Repository<MetricDefVersionEntity>,
    @InjectRepository(ConfigThresholdEntity)
    private readonly thresholdRepo: Repository<ConfigThresholdEntity>,
  ) {}

  // ===== Store =====
  async createStore(companyId: string, dto: CreateStoreDto) {
    const store = this.storeRepo.create({ ...dto, companyId });
    return this.storeRepo.save(store);
  }

  async getStores(companyId: string) {
    return this.storeRepo.find({
      where: { companyId },
      relations: ['siteBindings'],
    });
  }

  async getStoreById(companyId: string, id: string) {
    const store = await this.storeRepo.findOne({
      where: { id, companyId },
      relations: ['siteBindings', 'siteBindings.site'],
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  // ===== Site =====
  async createSite(companyId: string, dto: CreateSiteDto) {
    const site = this.siteRepo.create({ ...dto, companyId });
    return this.siteRepo.save(site);
  }

  async getSites(companyId: string) {
    return this.siteRepo.find({ where: { companyId } });
  }

  // ===== Binding =====
  async bindStoreSite(companyId: string, storeId: string, siteId: string) {
    const binding = this.bindingRepo.create({ storeId, siteId, companyId });
    return this.bindingRepo.save(binding);
  }

  // ===== SKU =====
  async createSku(companyId: string, dto: CreateSkuDto) {
    const sku = this.skuRepo.create({ ...dto, companyId });
    return this.skuRepo.save(sku);
  }

  async querySkus(
    companyId: string,
    query: QuerySkuDto,
  ): Promise<PaginatedResult<SkuMasterEntity>> {
    const qb = this.skuRepo
      .createQueryBuilder('sku')
      .where('sku.companyId = :companyId', { companyId });

    if (query.storeId) {
      qb.andWhere('sku.storeId = :storeId', { storeId: query.storeId });
    }
    if (query.siteId) {
      qb.andWhere('sku.siteId = :siteId', { siteId: query.siteId });
    }
    if (query.status) {
      qb.andWhere('sku.status = :status', { status: query.status });
    }
    if (query.keyword) {
      qb.andWhere('(sku.title ILIKE :kw OR sku.sku ILIKE :kw OR sku.asin ILIKE :kw)', {
        kw: `%${query.keyword}%`,
      });
    }

    const sortField = query.sortBy && ['createdAt', 'price', 'sku', 'title', 'status'].includes(query.sortBy)
      ? query.sortBy
      : 'createdAt';
    qb.orderBy(`sku.${sortField}`, query.sortOrder ?? 'DESC');

    const [items, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return new PaginatedResult(items, total, query.page, query.limit);
  }

  async getSkuById(companyId: string, id: string) {
    const sku = await this.skuRepo.findOne({
      where: { id, companyId },
      relations: ['store', 'site'],
    });
    if (!sku) throw new NotFoundException('SKU not found');
    return {
      ...sku,
      storeName: sku.store?.name ?? '',
      siteName: sku.site?.name ?? '',
    };
  }

  // ===== Competitor =====
  async createCompetitor(companyId: string, dto: CreateCompetitorDto) {
    const comp = this.competitorRepo.create({ ...dto, companyId });
    return this.competitorRepo.save(comp);
  }

  async getCompetitors(companyId: string) {
    return this.competitorRepo.find({ where: { companyId } });
  }

  // ===== Metric Def & Version =====
  async getMetricDefs(companyId: string) {
    return this.metricDefRepo.find({
      where: { companyId },
      relations: ['versions'],
    });
  }

  async createMetricDefVersion(
    companyId: string,
    metricDefId: string,
    formula: string,
    changelog: string,
  ) {
    // Get latest version number
    const latest = await this.metricVersionRepo.findOne({
      where: { metricDefId, companyId },
      order: { version: 'DESC' },
    });
    const nextVersion = latest ? latest.version + 1 : 1;

    // Deactivate old active versions
    if (latest) {
      await this.metricVersionRepo.update(
        { metricDefId, companyId, isActive: true },
        { isActive: false, effectiveTo: new Date() },
      );
    }

    const version = this.metricVersionRepo.create({
      metricDefId,
      companyId,
      version: nextVersion,
      formula,
      changelog,
      isActive: true,
      effectiveFrom: new Date(),
    });
    return this.metricVersionRepo.save(version);
  }

  // ===== Threshold =====
  async upsertThreshold(companyId: string, dto: UpdateThresholdDto) {
    const existing = await this.thresholdRepo.findOne({
      where: {
        companyId,
        metricCode: dto.metricCode,
        storeId: dto.storeId || undefined,
        siteId: dto.siteId || undefined,
        skuId: dto.skuId || undefined,
      },
    });

    if (existing) {
      Object.assign(existing, dto);
      return this.thresholdRepo.save(existing);
    }

    const threshold = this.thresholdRepo.create({ ...dto, companyId });
    return this.thresholdRepo.save(threshold);
  }

  async getThresholds(companyId: string) {
    return this.thresholdRepo.find({ where: { companyId } });
  }
}
