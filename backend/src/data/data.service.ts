import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import {
  SkuShopeePriceEntity,
  SkuTemuPriceEntity,
  SkuMercadolibrePriceEntity,
} from './entities/sku-platform-price.entity';
import { StorePromoterMappingEntity } from './entities/store-promoter-mapping.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { CreateSkuDto } from './dto/create-sku.dto';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
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
    @InjectRepository(SkuShopeePriceEntity)
    private readonly shopeePriceRepo: Repository<SkuShopeePriceEntity>,
    @InjectRepository(SkuTemuPriceEntity)
    private readonly temuPriceRepo: Repository<SkuTemuPriceEntity>,
    @InjectRepository(SkuMercadolibrePriceEntity)
    private readonly mlPriceRepo: Repository<SkuMercadolibrePriceEntity>,
    @InjectRepository(StorePromoterMappingEntity)
    private readonly promoterRepo: Repository<StorePromoterMappingEntity>,
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

  async updateStore(companyId: string, id: string, dto: UpdateStoreDto) {
    const store = await this.storeRepo.findOne({ where: { id, companyId } });
    if (!store) throw new NotFoundException('Store not found');
    Object.assign(store, dto);
    return this.storeRepo.save(store);
  }

  async deleteStore(companyId: string, id: string) {
    const store = await this.storeRepo.findOne({ where: { id, companyId } });
    if (!store) throw new NotFoundException('Store not found');
    await this.storeRepo.remove(store);
    return { deleted: true };
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

  async updateSku(companyId: string, id: string, dto: UpdateSkuDto) {
    const sku = await this.skuRepo.findOne({ where: { id, companyId } });
    if (!sku) throw new NotFoundException('SKU not found');
    Object.assign(sku, dto);
    return this.skuRepo.save(sku);
  }

  async deleteSku(companyId: string, id: string) {
    const sku = await this.skuRepo.findOne({ where: { id, companyId } });
    if (!sku) throw new NotFoundException('SKU not found');
    await this.skuRepo.remove(sku);
    return { deleted: true };
  }

  // ===== Competitor =====
  async createCompetitor(companyId: string, dto: CreateCompetitorDto) {
    const comp = this.competitorRepo.create({ ...dto, companyId });
    return this.competitorRepo.save(comp);
  }

  async getCompetitors(companyId: string) {
    return this.competitorRepo.find({ where: { companyId } });
  }

  async getCompetitorSnapshots(
    competitorId: string,
    companyId: string,
    days: number = 30,
  ) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.snapshotRepo
      .createQueryBuilder('snap')
      .where('snap.competitorId = :competitorId', { competitorId })
      .andWhere('snap.companyId = :companyId', { companyId })
      .andWhere('snap.snapshotAt >= :since', { since })
      .orderBy('snap.snapshotAt', 'DESC')
      .getMany();
  }

  async getSkuCompetitors(skuId: string, companyId: string) {
    const competitors = await this.competitorRepo.find({
      where: { skuId, companyId },
    });

    const result = await Promise.all(
      competitors.map(async (comp) => {
        const latestSnapshot = await this.snapshotRepo
          .createQueryBuilder('snap')
          .where('snap.competitorId = :competitorId', {
            competitorId: comp.id,
          })
          .andWhere('snap.companyId = :companyId', { companyId })
          .orderBy('snap.snapshotAt', 'DESC')
          .limit(1)
          .getOne();

        return { ...comp, latestSnapshot: latestSnapshot || null };
      }),
    );

    return result;
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

  // ===== Platform Prices =====
  async getPlatformPrices(skuId: string, companyId: string) {
    const [shopee, temu, mercadolibre] = await Promise.all([
      this.shopeePriceRepo.findOne({ where: { skuId, companyId } }),
      this.temuPriceRepo.findOne({ where: { skuId, companyId } }),
      this.mlPriceRepo.findOne({ where: { skuId, companyId } }),
    ]);
    return { shopee, temu, mercadolibre };
  }

  async upsertPlatformPrice(
    platform: string,
    skuId: string,
    companyId: string,
    data: Record<string, any>,
  ) {
    const repoMap: Record<string, Repository<any>> = {
      shopee: this.shopeePriceRepo,
      temu: this.temuPriceRepo,
      mercadolibre: this.mlPriceRepo,
    };
    const repo = repoMap[platform];
    if (!repo) {
      throw new BadRequestException('不支持的平台: ' + platform);
    }

    const existing = await repo.findOne({ where: { skuId, companyId } });
    if (existing) {
      Object.assign(existing, data);
      return repo.save(existing);
    } else {
      const entity = repo.create({ ...data, skuId, companyId });
      return repo.save(entity);
    }
  }

  // ===== Product Image =====
  async updateSkuImage(companyId: string, skuId: string, imageUrl: string) {
    const sku = await this.skuRepo.findOne({ where: { id: skuId, companyId } });
    if (!sku) throw new NotFoundException('SKU not found');
    sku.imageUrl = imageUrl;
    return this.skuRepo.save(sku);
  }

  // ===== Store Promoter Mapping =====
  async getStorePromoterMappings(companyId: string) {
    return this.promoterRepo.find({ where: { companyId }, order: { storeName: 'ASC' } });
  }

  async upsertStorePromoterMapping(
    companyId: string,
    storeName: string,
    userId: string,
    promoterName: string,
    isPrimary = true,
  ) {
    const existing = await this.promoterRepo.findOne({
      where: { companyId, storeName, userId },
    });
    if (existing) {
      existing.promoterName = promoterName;
      existing.isPrimary = isPrimary;
      return this.promoterRepo.save(existing);
    }
    const mapping = this.promoterRepo.create({
      companyId,
      storeName,
      userId,
      promoterName,
      isPrimary,
    });
    return this.promoterRepo.save(mapping);
  }

  async deleteStorePromoterMapping(companyId: string, id: string) {
    const mapping = await this.promoterRepo.findOne({ where: { id, companyId } });
    if (!mapping) throw new NotFoundException('Mapping not found');
    await this.promoterRepo.remove(mapping);
    return { deleted: true };
  }
}
