import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricSnapshotEntity } from './entities/metric-snapshot.entity';
import { SalesFactEntity } from './entities/sales-fact.entity';
import { AdsFactEntity } from './entities/ads-fact.entity';
import { InventoryFactEntity } from './entities/inventory-fact.entity';
import { AlertEntity } from '../alert/entities/alert.entity';
import { AlertStatus } from '../common/enums';
import { QueryMetricsDto } from './dto/query-metrics.dto';
import { WarRoomQueryDto } from './dto/war-room-query.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';

/** Safe number parser: returns 0 for null/undefined/NaN */
const safeFloat = (val: unknown): number => {
  const n = parseFloat(val as string);
  return Number.isFinite(n) ? n : 0;
};
const safeInt = (val: unknown): number => {
  const n = parseInt(val as string, 10);
  return Number.isFinite(n) ? n : 0;
};

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
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
  ) {}

  async getWarRoomMetrics(companyId: string, query: WarRoomQueryDto) {
    const params: Record<string, unknown> = { companyId };
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

    const salesResult = await this.salesRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.orderedRevenue), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'totalUnits')
      .addSelect('COALESCE(AVG(s.conversionRate), 0)', 'avgConversionRate')
      .where(
        `s.companyId = :companyId ${buildExtraWhere('s')} ${this.buildDateFilter('s', query.startDate, query.endDate)}`,
        params,
      )
      .getRawOne();

    const adsResult = await this.adsRepo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.adSpend), 0)', 'totalAdSpend')
      .addSelect('COALESCE(SUM(a.adRevenue), 0)', 'totalAdRevenue')
      .addSelect('COALESCE(SUM(a.impressions), 0)', 'totalImpressions')
      .addSelect('COALESCE(SUM(a.clicks), 0)', 'totalClicks')
      .where(
        `a.companyId = :companyId ${buildExtraWhere('a')} ${this.buildDateFilter('a', query.startDate, query.endDate)}`,
        params,
      )
      .getRawOne();

    const stockoutResult = await this.inventoryRepo
      .createQueryBuilder('i')
      .select('COUNT(DISTINCT i.skuId)', 'stockoutSkuCount')
      .where(
        `i.companyId = :companyId AND i.isStockout = true ${buildExtraWhere('i')} ${this.buildDateFilter('i', query.startDate, query.endDate)}`,
        params,
      )
      .getRawOne();

    // P0-07: NaN-safe number parsing
    const totalRevenue = safeFloat(salesResult?.totalRevenue);
    const totalAdSpend = safeFloat(adsResult?.totalAdSpend);
    const tacos = totalRevenue > 0 ? (totalAdSpend / totalRevenue) * 100 : 0;

    const skuCount = await this.salesRepo
      .createQueryBuilder('s')
      .select('COUNT(DISTINCT s.skuId)', 'cnt')
      .where('s.companyId = :companyId', { companyId })
      .getRawOne();

    const activeAlertCount = await this.alertRepo
      .createQueryBuilder('al')
      .where('al.companyId = :companyId AND al.status = :status', {
        companyId,
        status: AlertStatus.OPEN,
      })
      .getCount();

    return {
      totalSales: totalRevenue,
      totalOrders: safeInt(salesResult?.totalUnits),
      adsSpend: totalAdSpend,
      tacos: Math.round(tacos * 100) / 100,
      stockoutSkus: safeInt(stockoutResult?.stockoutSkuCount),
      avgDaysOfCover: 0,
      totalSkus: safeInt(skuCount?.cnt),
      activeAlerts: activeAlertCount,
    };
  }

  async getTrends(companyId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().slice(0, 10);

    const salesTrend = await this.salesRepo
      .createQueryBuilder('s')
      .select('s.reportDate', 'date')
      .addSelect('COALESCE(SUM(s.orderedRevenue), 0)', 'sales')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'orders')
      .where('s.companyId = :companyId AND s.reportDate >= :startDate', {
        companyId,
        startDate: startStr,
      })
      .groupBy('s.reportDate')
      .orderBy('s.reportDate', 'ASC')
      .getRawMany();

    const adsTrend = await this.adsRepo
      .createQueryBuilder('a')
      .select('a.reportDate', 'date')
      .addSelect('COALESCE(SUM(a.adSpend), 0)', 'spend')
      .addSelect('COALESCE(SUM(a.adRevenue), 0)', 'adRevenue')
      .addSelect('COALESCE(SUM(a.adOrders), 0)', 'orders')
      .where('a.companyId = :companyId AND a.reportDate >= :startDate', {
        companyId,
        startDate: startStr,
      })
      .groupBy('a.reportDate')
      .orderBy('a.reportDate', 'ASC')
      .getRawMany();

    const adsTrendWithAcos = adsTrend.map((row: Record<string, unknown>) => {
      const spend = safeFloat(row.spend);
      const adRevenue = safeFloat(row.adRevenue);
      const orders = safeInt(row.orders);
      return {
        date: row.date,
        spend,
        orders,
        acos: adRevenue > 0 ? Math.round((spend / adRevenue) * 10000) / 100 : 0,
      };
    });

    return {
      salesTrend: salesTrend.map((row: Record<string, unknown>) => ({
        date: row.date,
        sales: safeFloat(row.sales),
        orders: safeInt(row.orders),
      })),
      adsTrend: adsTrendWithAcos,
    };
  }

  async queryMetrics(
    companyId: string,
    query: QueryMetricsDto,
  ): Promise<PaginatedResult<MetricSnapshotEntity>> {
    const qb = this.snapshotRepo
      .createQueryBuilder('m')
      .where('m.companyId = :companyId', { companyId });

    if (query.skuId) qb.andWhere('m.skuId = :skuId', { skuId: query.skuId });
    if (query.storeId)
      qb.andWhere('m.storeId = :storeId', { storeId: query.storeId });
    if (query.siteId) qb.andWhere('m.siteId = :siteId', { siteId: query.siteId });
    if (query.metricCode)
      qb.andWhere('m.metricCode = :metricCode', { metricCode: query.metricCode });
    if (query.window) qb.andWhere('m.window = :window', { window: query.window });
    if (query.startDate)
      qb.andWhere('m.windowStart >= :startDate', { startDate: query.startDate });
    if (query.endDate)
      qb.andWhere('m.windowEnd <= :endDate', { endDate: query.endDate });

    qb.orderBy('m.windowStart', 'DESC');

    const [items, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return new PaginatedResult(items, total, query.page, query.limit);
  }

  async getSkuMetrics(
    companyId: string,
    skuId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const start = startDate || sevenDaysAgo.toISOString().slice(0, 10);

    const params: Record<string, unknown> = { companyId, skuId, startDate: start };
    if (endDate) params.endDate = endDate;

    const dailySales = await this.salesRepo
      .createQueryBuilder('s')
      .select('s.reportDate', 'date')
      .addSelect('COALESCE(SUM(s.orderedRevenue), 0)', 'revenue')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'units')
      .where(
        `s.companyId = :companyId AND s.skuId = :skuId AND s.reportDate >= :startDate`,
        params,
      )
      .groupBy('s.reportDate')
      .orderBy('s.reportDate', 'ASC')
      .getRawMany();

    const dailyAds = await this.adsRepo
      .createQueryBuilder('a')
      .select('a.reportDate', 'date')
      .addSelect('COALESCE(SUM(a.adSpend), 0)', 'spend')
      .addSelect('COALESCE(SUM(a.adRevenue), 0)', 'adRevenue')
      .where(
        `a.companyId = :companyId AND a.skuId = :skuId AND a.reportDate >= :startDate`,
        params,
      )
      .groupBy('a.reportDate')
      .orderBy('a.reportDate', 'ASC')
      .getRawMany();

    const inventory = await this.inventoryRepo.findOne({
      where: { companyId, skuId },
      order: { reportDate: 'DESC' },
    });

    const sales7d = dailySales.map((r: Record<string, unknown>) => safeFloat(r.revenue));
    const units7d = dailySales.map((r: Record<string, unknown>) => safeInt(r.units));
    const adsSpend7d = dailyAds.map((r: Record<string, unknown>) => safeFloat(r.spend));
    const acos7d = dailyAds.map((r: Record<string, unknown>) => {
      const spend = safeFloat(r.spend);
      const rev = safeFloat(r.adRevenue);
      return rev > 0 ? Math.round((spend / rev) * 10000) / 100 : 0;
    });

    const totalRevenue = sales7d.reduce((a, b) => a + b, 0);
    const totalAdSpend = adsSpend7d.reduce((a, b) => a + b, 0);
    const tacos =
      totalRevenue > 0
        ? Math.round((totalAdSpend / totalRevenue) * 10000) / 100
        : 0;

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

  private buildDateFilter(
    alias: string,
    startDate?: string,
    endDate?: string,
  ): string {
    const parts: string[] = [];
    if (startDate) parts.push(`AND ${alias}.reportDate >= :startDate`);
    if (endDate) parts.push(`AND ${alias}.reportDate <= :endDate`);
    return parts.join(' ');
  }
}
