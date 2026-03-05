import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricSnapshotEntity } from './entities/metric-snapshot.entity';
import { SalesFactEntity } from './entities/sales-fact.entity';
import { AdsFactEntity } from './entities/ads-fact.entity';
import { InventoryFactEntity } from './entities/inventory-fact.entity';
import { QueryMetricsDto } from './dto/query-metrics.dto';
import { WarRoomQueryDto } from './dto/war-room-query.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(MetricSnapshotEntity)
    private readonly snapshotRepo: Repository<MetricSnapshotEntity>,
    @InjectRepository(SalesFactEntity)
    private readonly salesRepo: Repository<SalesFactEntity>,
    @InjectRepository(AdsFactEntity)
    private readonly adsRepo: Repository<AdsFactEntity>,
    @InjectRepository(InventoryFactEntity)
    private readonly inventoryRepo: Repository<InventoryFactEntity>,
  ) {}

  /**
   * War Room aggregate: returns total sales, ad spend, TACOS, stockout SKU count, etc.
   */
  async getWarRoomMetrics(companyId: string, query: WarRoomQueryDto) {
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);
    const storeFilter = query.storeId ? 'AND store_id = :storeId' : '';
    const siteFilter = query.siteId ? 'AND site_id = :siteId' : '';
    const extraWhere = `${storeFilter} ${siteFilter}`;
    const params: any = { companyId };
    if (query.storeId) params.storeId = query.storeId;
    if (query.siteId) params.siteId = query.siteId;
    if (query.startDate) params.startDate = query.startDate;
    if (query.endDate) params.endDate = query.endDate;

    // Total sales
    const salesResult = await this.salesRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.orderedRevenue), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'totalUnits')
      .addSelect('COALESCE(AVG(s.conversionRate), 0)', 'avgConversionRate')
      .where(`s.companyId = :companyId ${extraWhere} ${dateFilter}`, params)
      .getRawOne();

    // Total ads
    const adsResult = await this.adsRepo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.adSpend), 0)', 'totalAdSpend')
      .addSelect('COALESCE(SUM(a.adRevenue), 0)', 'totalAdRevenue')
      .addSelect('COALESCE(SUM(a.impressions), 0)', 'totalImpressions')
      .addSelect('COALESCE(SUM(a.clicks), 0)', 'totalClicks')
      .where(`a.companyId = :companyId ${extraWhere} ${dateFilter}`, params)
      .getRawOne();

    // Stockout count (latest date)
    const stockoutResult = await this.inventoryRepo
      .createQueryBuilder('i')
      .select('COUNT(DISTINCT i.skuId)', 'stockoutSkuCount')
      .where(`i.companyId = :companyId AND i.isStockout = true ${extraWhere} ${dateFilter}`, params)
      .getRawOne();

    const totalRevenue = parseFloat(salesResult?.totalRevenue) || 0;
    const totalAdSpend = parseFloat(adsResult?.totalAdSpend) || 0;
    const tacos = totalRevenue > 0 ? (totalAdSpend / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalUnits: parseInt(salesResult?.totalUnits) || 0,
      avgConversionRate: parseFloat(salesResult?.avgConversionRate) || 0,
      totalAdSpend,
      totalAdRevenue: parseFloat(adsResult?.totalAdRevenue) || 0,
      totalImpressions: parseInt(adsResult?.totalImpressions) || 0,
      totalClicks: parseInt(adsResult?.totalClicks) || 0,
      tacos: Math.round(tacos * 100) / 100,
      stockoutSkuCount: parseInt(stockoutResult?.stockoutSkuCount) || 0,
    };
  }

  /**
   * Query metric snapshots with pagination
   */
  async queryMetrics(
    companyId: string,
    query: QueryMetricsDto,
  ): Promise<PaginatedResult<MetricSnapshotEntity>> {
    const qb = this.snapshotRepo
      .createQueryBuilder('m')
      .where('m.companyId = :companyId', { companyId });

    if (query.skuId) qb.andWhere('m.skuId = :skuId', { skuId: query.skuId });
    if (query.storeId) qb.andWhere('m.storeId = :storeId', { storeId: query.storeId });
    if (query.siteId) qb.andWhere('m.siteId = :siteId', { siteId: query.siteId });
    if (query.metricCode) qb.andWhere('m.metricCode = :metricCode', { metricCode: query.metricCode });
    if (query.window) qb.andWhere('m.window = :window', { window: query.window });
    if (query.startDate) qb.andWhere('m.windowStart >= :startDate', { startDate: query.startDate });
    if (query.endDate) qb.andWhere('m.windowEnd <= :endDate', { endDate: query.endDate });

    qb.orderBy('m.windowStart', 'DESC');

    const [items, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return new PaginatedResult(items, total, query.page, query.limit);
  }

  /**
   * Get SKU-level metrics summary
   */
  async getSkuMetrics(companyId: string, skuId: string, startDate?: string, endDate?: string) {
    const params: any = { companyId, skuId };
    const dateFilter = this.buildDateFilter(startDate, endDate);
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const sales = await this.salesRepo
      .createQueryBuilder('s')
      .select('SUM(s.orderedRevenue)', 'revenue')
      .addSelect('SUM(s.unitsOrdered)', 'units')
      .where(`s.companyId = :companyId AND s.skuId = :skuId ${dateFilter}`, params)
      .getRawOne();

    const ads = await this.adsRepo
      .createQueryBuilder('a')
      .select('SUM(a.adSpend)', 'adSpend')
      .addSelect('SUM(a.adRevenue)', 'adRevenue')
      .addSelect('SUM(a.clicks)', 'clicks')
      .addSelect('SUM(a.impressions)', 'impressions')
      .where(`a.companyId = :companyId AND a.skuId = :skuId ${dateFilter}`, params)
      .getRawOne();

    const inventory = await this.inventoryRepo.findOne({
      where: { companyId, skuId },
      order: { reportDate: 'DESC' },
    });

    return {
      revenue: parseFloat(sales?.revenue) || 0,
      units: parseInt(sales?.units) || 0,
      adSpend: parseFloat(ads?.adSpend) || 0,
      adRevenue: parseFloat(ads?.adRevenue) || 0,
      clicks: parseInt(ads?.clicks) || 0,
      impressions: parseInt(ads?.impressions) || 0,
      inventory: inventory
        ? {
            fulfillableQty: inventory.fulfillableQty,
            daysOfSupply: inventory.daysOfSupply,
            isStockout: inventory.isStockout,
          }
        : null,
    };
  }

  private buildDateFilter(startDate?: string, endDate?: string): string {
    const parts: string[] = [];
    if (startDate) parts.push('AND report_date >= :startDate');
    if (endDate) parts.push('AND report_date <= :endDate');
    return parts.join(' ');
  }
}
