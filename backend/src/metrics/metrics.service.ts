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

    // Count total SKUs and active alerts for war room display
    const skuCount = await this.salesRepo
      .createQueryBuilder('s')
      .select('COUNT(DISTINCT s.skuId)', 'cnt')
      .where('s.companyId = :companyId', { companyId })
      .getRawOne();

    return {
      totalSales: totalRevenue,
      totalOrders: parseInt(salesResult?.totalUnits) || 0,
      adsSpend: totalAdSpend,
      tacos: Math.round(tacos * 100) / 100,
      stockoutSkus: parseInt(stockoutResult?.stockoutSkuCount) || 0,
      avgDaysOfCover: 0,
      totalSkus: parseInt(skuCount?.cnt) || 0,
      activeAlerts: 0,
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
   * Get SKU-level metrics summary with 7-day daily breakdown
   */
  async getSkuMetrics(companyId: string, skuId: string, startDate?: string, endDate?: string) {
    // Default to last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const start = startDate || sevenDaysAgo.toISOString().slice(0, 10);

    const params: any = { companyId, skuId, startDate: start };
    if (endDate) params.endDate = endDate;

    // Daily sales for 7d array
    const dailySales = await this.salesRepo
      .createQueryBuilder('s')
      .select('s.reportDate', 'date')
      .addSelect('COALESCE(SUM(s.orderedRevenue), 0)', 'revenue')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'units')
      .where(`s.companyId = :companyId AND s.skuId = :skuId AND s.reportDate >= :startDate`, params)
      .groupBy('s.reportDate')
      .orderBy('s.reportDate', 'ASC')
      .getRawMany();

    // Daily ads for 7d array
    const dailyAds = await this.adsRepo
      .createQueryBuilder('a')
      .select('a.reportDate', 'date')
      .addSelect('COALESCE(SUM(a.adSpend), 0)', 'spend')
      .addSelect('COALESCE(SUM(a.adRevenue), 0)', 'adRevenue')
      .where(`a.companyId = :companyId AND a.skuId = :skuId AND a.reportDate >= :startDate`, params)
      .groupBy('a.reportDate')
      .orderBy('a.reportDate', 'ASC')
      .getRawMany();

    const inventory = await this.inventoryRepo.findOne({
      where: { companyId, skuId },
      order: { reportDate: 'DESC' },
    });

    const sales7d = dailySales.map((r: any) => parseFloat(r.revenue) || 0);
    const units7d = dailySales.map((r: any) => parseInt(r.units) || 0);
    const adsSpend7d = dailyAds.map((r: any) => parseFloat(r.spend) || 0);
    const acos7d = dailyAds.map((r: any) => {
      const spend = parseFloat(r.spend) || 0;
      const rev = parseFloat(r.adRevenue) || 0;
      return rev > 0 ? Math.round((spend / rev) * 10000) / 100 : 0;
    });

    const totalRevenue = sales7d.reduce((a, b) => a + b, 0);
    const totalAdSpend = adsSpend7d.reduce((a, b) => a + b, 0);
    const tacos = totalRevenue > 0 ? Math.round((totalAdSpend / totalRevenue) * 10000) / 100 : 0;

    return {
      sales7d,
      adsSpend7d,
      acos7d,
      units7d,
      daysOfCover: inventory?.daysOfSupply ?? 0,
      tacos,
      revenue: totalRevenue,
      profit: 0,
    };
  }

  private buildDateFilter(alias: string, startDate?: string, endDate?: string): string {
    const parts: string[] = [];
    if (startDate) parts.push(`AND ${alias}.reportDate >= :startDate`);
    if (endDate) parts.push(`AND ${alias}.reportDate <= :endDate`);
    return parts.join(' ');
  }
}
