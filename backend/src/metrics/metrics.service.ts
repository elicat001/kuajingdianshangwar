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
    const params: any = { companyId };
    if (query.storeId) params.storeId = query.storeId;
    if (query.siteId) params.siteId = query.siteId;
    if (query.startDate) params.startDate = query.startDate;
    if (query.endDate) params.endDate = query.endDate;

    const buildExtraWhere = (alias: string) => {
      const parts: string[] = [];
      if (query.storeId) parts.push(`AND ${alias}.storeId = :storeId`);
      if (query.siteId) parts.push(`AND ${alias}.siteId = :siteId`);
      return parts.join(' ');
    };

    // Total sales
    const salesResult = await this.salesRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.orderedRevenue), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'totalUnits')
      .addSelect('COALESCE(AVG(s.conversionRate), 0)', 'avgConversionRate')
      .where(`s.companyId = :companyId ${buildExtraWhere('s')} ${this.buildDateFilter('s', query.startDate, query.endDate)}`, params)
      .getRawOne();

    // Total ads
    const adsResult = await this.adsRepo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.adSpend), 0)', 'totalAdSpend')
      .addSelect('COALESCE(SUM(a.adRevenue), 0)', 'totalAdRevenue')
      .addSelect('COALESCE(SUM(a.impressions), 0)', 'totalImpressions')
      .addSelect('COALESCE(SUM(a.clicks), 0)', 'totalClicks')
      .where(`a.companyId = :companyId ${buildExtraWhere('a')} ${this.buildDateFilter('a', query.startDate, query.endDate)}`, params)
      .getRawOne();

    // Stockout count (latest date)
    const stockoutResult = await this.inventoryRepo
      .createQueryBuilder('i')
      .select('COUNT(DISTINCT i.skuId)', 'stockoutSkuCount')
      .where(`i.companyId = :companyId AND i.isStockout = true ${buildExtraWhere('i')} ${this.buildDateFilter('i', query.startDate, query.endDate)}`, params)
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
   * Trend data for war-room charts: daily sales and ads over N days
   */
  async getTrends(companyId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().slice(0, 10);

    const salesTrend = await this.salesRepo
      .createQueryBuilder('s')
      .select('s.reportDate', 'date')
      .addSelect('COALESCE(SUM(s.orderedRevenue), 0)', 'sales')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'orders')
      .where('s.companyId = :companyId AND s.reportDate >= :startDate', { companyId, startDate: startStr })
      .groupBy('s.reportDate')
      .orderBy('s.reportDate', 'ASC')
      .getRawMany();

    const adsTrend = await this.adsRepo
      .createQueryBuilder('a')
      .select('a.reportDate', 'date')
      .addSelect('COALESCE(SUM(a.adSpend), 0)', 'spend')
      .addSelect('COALESCE(SUM(a.adOrders), 0)', 'orders')
      .where('a.companyId = :companyId AND a.reportDate >= :startDate', { companyId, startDate: startStr })
      .groupBy('a.reportDate')
      .orderBy('a.reportDate', 'ASC')
      .getRawMany();

    // Calculate ACOS per day for ads trend
    const adsTrendWithAcos = adsTrend.map((row: any) => {
      const spend = parseFloat(row.spend) || 0;
      const orders = parseInt(row.orders) || 0;
      return {
        date: row.date,
        spend,
        orders,
        acos: orders > 0 ? Math.round((spend / orders) * 100) / 100 : 0,
      };
    });

    return {
      salesTrend: salesTrend.map((row: any) => ({
        date: row.date,
        sales: parseFloat(row.sales) || 0,
        orders: parseInt(row.orders) || 0,
      })),
      adsTrend: adsTrendWithAcos,
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
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const sales = await this.salesRepo
      .createQueryBuilder('s')
      .select('SUM(s.orderedRevenue)', 'revenue')
      .addSelect('SUM(s.unitsOrdered)', 'units')
      .where(`s.companyId = :companyId AND s.skuId = :skuId ${this.buildDateFilter('s', startDate, endDate)}`, params)
      .getRawOne();

    const ads = await this.adsRepo
      .createQueryBuilder('a')
      .select('SUM(a.adSpend)', 'adSpend')
      .addSelect('SUM(a.adRevenue)', 'adRevenue')
      .addSelect('SUM(a.clicks)', 'clicks')
      .addSelect('SUM(a.impressions)', 'impressions')
      .where(`a.companyId = :companyId AND a.skuId = :skuId ${this.buildDateFilter('a', startDate, endDate)}`, params)
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

  private buildDateFilter(alias: string, startDate?: string, endDate?: string): string {
    const parts: string[] = [];
    if (startDate) parts.push(`AND ${alias}.reportDate >= :startDate`);
    if (endDate) parts.push(`AND ${alias}.reportDate <= :endDate`);
    return parts.join(' ');
  }
}
