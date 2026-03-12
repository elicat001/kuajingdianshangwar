import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricSnapshotEntity } from './entities/metric-snapshot.entity';
import { SalesFactEntity } from './entities/sales-fact.entity';
import { AdsFactEntity } from './entities/ads-fact.entity';
import { InventoryFactEntity } from './entities/inventory-fact.entity';
import { ProductPerformanceEntity } from './entities/product-performance.entity';
import { ProductPerformanceReportEntity } from './entities/product-performance-report.entity';
import { PromotionFeeReportEntity } from './entities/promotion-fee-report.entity';
import { InventoryReportEntity } from './entities/inventory-report.entity';
import { StorePromoterMappingEntity } from '../data/entities/store-promoter-mapping.entity';
import { AlertEntity } from '../alert/entities/alert.entity';
import { AlertStatus } from '../common/enums';
import { QueryMetricsDto } from './dto/query-metrics.dto';
import { WarRoomQueryDto } from './dto/war-room-query.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';
import {
  calculateIfsProfit,
  calculateDaysOfSale,
  generateSevenDates,
} from '../common/utils/profit-calculator';

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
    @InjectRepository(ProductPerformanceEntity)
    private readonly perfRepo: Repository<ProductPerformanceEntity>,
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
    @InjectRepository(ProductPerformanceReportEntity)
    private readonly pprRepo: Repository<ProductPerformanceReportEntity>,
    @InjectRepository(PromotionFeeReportEntity)
    private readonly promoFeeRepo: Repository<PromotionFeeReportEntity>,
    @InjectRepository(InventoryReportEntity)
    private readonly invReportRepo: Repository<InventoryReportEntity>,
    @InjectRepository(StorePromoterMappingEntity)
    private readonly storePromoterRepo: Repository<StorePromoterMappingEntity>,
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

    // --- Previous-period comparison for trend calculation ---
    const now = new Date();
    const effectiveEnd = query.endDate ? new Date(query.endDate) : now;
    const effectiveStart = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const periodDays = Math.max(
      1,
      Math.round(
        (effectiveEnd.getTime() - effectiveStart.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const prevEndDate = new Date(effectiveStart);
    const prevStartDate = new Date(effectiveStart);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);

    const prevParams: Record<string, unknown> = {
      companyId,
      prevStart: prevStartDate.toISOString().slice(0, 10),
      prevEnd: prevEndDate.toISOString().slice(0, 10),
    };
    if (query.storeId) prevParams.storeId = query.storeId;
    if (query.siteId) prevParams.siteId = query.siteId;

    const buildPrevDateFilter = (alias: string) =>
      `AND ${alias}.reportDate >= :prevStart AND ${alias}.reportDate < :prevEnd`;

    const prevSalesResult = await this.salesRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.orderedRevenue), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'totalUnits')
      .where(
        `s.companyId = :companyId ${buildExtraWhere('s')} ${buildPrevDateFilter('s')}`,
        prevParams,
      )
      .getRawOne();

    const prevAdsResult = await this.adsRepo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.adSpend), 0)', 'totalAdSpend')
      .where(
        `a.companyId = :companyId ${buildExtraWhere('a')} ${buildPrevDateFilter('a')}`,
        prevParams,
      )
      .getRawOne();

    const prevRevenue = safeFloat(prevSalesResult?.totalRevenue);
    const prevAdSpend = safeFloat(prevAdsResult?.totalAdSpend);
    const prevTacos = prevRevenue > 0 ? (prevAdSpend / prevRevenue) * 100 : 0;

    // Calculate trend percentages (positive = growth, negative = decline)
    const salesTrend =
      prevRevenue > 0
        ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10
        : null;
    const adsSpendTrend =
      prevAdSpend > 0
        ? Math.round(((totalAdSpend - prevAdSpend) / prevAdSpend) * 1000) / 10
        : null;
    const tacosTrend =
      prevTacos > 0
        ? Math.round((tacos - prevTacos) * 10) / 10
        : null;
    // --- End of trend calculation ---

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

    const avgDaysResult = await this.inventoryRepo
      .createQueryBuilder('inv')
      .select('AVG(inv.daysOfSupply)', 'avg')
      .where('inv.companyId = :companyId', { companyId })
      .andWhere(
        'inv.reportDate = (SELECT MAX(report_date) FROM inventory_facts WHERE company_id = :companyId)',
        { companyId },
      )
      .getRawOne();

    return {
      totalSales: totalRevenue,
      totalOrders: safeInt(salesResult?.totalUnits),
      adsSpend: totalAdSpend,
      tacos: Math.round(tacos * 100) / 100,
      stockoutSkus: safeInt(stockoutResult?.stockoutSkuCount),
      avgDaysOfCover: Math.round(safeFloat(avgDaysResult?.avg)),
      totalSkus: safeInt(skuCount?.cnt),
      activeAlerts: activeAlertCount,
      salesTrend,
      adsSpendTrend,
      tacosTrend,
      stockoutTrend: null, // 暂无历史缺货数据
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

  async getLinkAnalysis(companyId: string, query: { storeId?: string; siteId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    // Get all SKUs with both sales and ads data
    const qb = this.salesRepo
      .createQueryBuilder('s')
      .select('s.skuId', 'skuId')
      .addSelect('s.storeId', 'storeId')
      .addSelect('COALESCE(SUM(s.orderedRevenue), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'totalUnits')
      .addSelect('COALESCE(AVG(s.conversionRate), 0)', 'avgCvr')
      .where('s.companyId = :companyId', { companyId });

    if (query.storeId) qb.andWhere('s.storeId = :storeId', { storeId: query.storeId });
    if (query.siteId) qb.andWhere('s.siteId = :siteId', { siteId: query.siteId });
    if (query.startDate) qb.andWhere('s.reportDate >= :startDate', { startDate: query.startDate });
    if (query.endDate) qb.andWhere('s.reportDate <= :endDate', { endDate: query.endDate });

    qb.groupBy('s.skuId').addGroupBy('s.storeId');

    const salesRows = await qb.getRawMany();

    // Get ads data for same filters
    const adsQb = this.adsRepo
      .createQueryBuilder('a')
      .select('a.skuId', 'skuId')
      .addSelect('a.storeId', 'storeId')
      .addSelect('COALESCE(SUM(a.adSpend), 0)', 'totalAdSpend')
      .addSelect('COALESCE(SUM(a.adRevenue), 0)', 'totalAdRevenue')
      .addSelect('COALESCE(SUM(a.impressions), 0)', 'totalImpressions')
      .addSelect('COALESCE(SUM(a.clicks), 0)', 'totalClicks')
      .addSelect('COALESCE(SUM(a.adOrders), 0)', 'totalAdOrders')
      .where('a.companyId = :companyId', { companyId });

    if (query.storeId) adsQb.andWhere('a.storeId = :storeId', { storeId: query.storeId });
    if (query.siteId) adsQb.andWhere('a.siteId = :siteId', { siteId: query.siteId });
    if (query.startDate) adsQb.andWhere('a.reportDate >= :startDate', { startDate: query.startDate });
    if (query.endDate) adsQb.andWhere('a.reportDate <= :endDate', { endDate: query.endDate });

    adsQb.groupBy('a.skuId').addGroupBy('a.storeId');

    const adsRows = await adsQb.getRawMany();

    // Build ads lookup map
    const adsMap = new Map<string, Record<string, unknown>>();
    for (const row of adsRows) {
      adsMap.set(`${row.skuId}_${row.storeId}`, row);
    }

    // Merge and calculate
    const merged = salesRows.map((s: Record<string, unknown>) => {
      const key = `${s.skuId}_${s.storeId}`;
      const a = adsMap.get(key) || {} as Record<string, unknown>;
      const revenue = safeFloat(s.totalRevenue);
      const units = safeInt(s.totalUnits);
      const adSpend = safeFloat(a.totalAdSpend);
      const adRevenue = safeFloat(a.totalAdRevenue);
      const clicks = safeInt(a.totalClicks);
      const impressions = safeInt(a.totalImpressions);
      const adOrders = safeInt(a.totalAdOrders);
      const acos = adRevenue > 0 ? Math.round((adSpend / adRevenue) * 10000) / 100 : 0;
      const tacos = revenue > 0 ? Math.round((adSpend / revenue) * 10000) / 100 : 0;
      const roas = adSpend > 0 ? Math.round((adRevenue / adSpend) * 100) / 100 : 0;
      const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
      const cpc = clicks > 0 ? Math.round((adSpend / clicks) * 100) / 100 : 0;
      const profit = revenue - adSpend; // simplified profit (no COGS for now)

      return {
        skuId: s.skuId,
        storeId: s.storeId,
        revenue,
        units,
        adSpend,
        adRevenue,
        adOrders,
        impressions,
        clicks,
        acos,
        tacos,
        roas,
        ctr,
        cpc,
        profit,
        avgCvr: Math.round(safeFloat(s.avgCvr) * 10000) / 100,
      };
    });

    // Sort by revenue desc
    merged.sort((a, b) => b.revenue - a.revenue);

    const total = merged.length;
    const data = merged.slice((page - 1) * pageSize, page * pageSize);

    return { data, total, page, pageSize };
  }

  async getCategorySales(companyId: string) {
    const rows = await this.salesRepo
      .createQueryBuilder('s')
      .select('s.siteId', 'siteId')
      .addSelect('COALESCE(SUM(s.orderedRevenue), 0)', 'revenue')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'units')
      .where('s.companyId = :companyId', { companyId })
      .groupBy('s.siteId')
      .orderBy('"revenue"', 'DESC')
      .getRawMany();

    return rows.map((r: Record<string, unknown>) => ({
      name: r.siteId || '未分类',
      revenue: Number(r.revenue) || 0,
      units: Number(r.units) || 0,
    }));
  }

  async getPlatformComparison(companyId: string) {
    const salesRows = await this.salesRepo
      .createQueryBuilder('s')
      .select('s.storeId', 'storeId')
      .addSelect('COALESCE(SUM(s.orderedRevenue), 0)', 'revenue')
      .addSelect('COALESCE(SUM(s.unitsOrdered), 0)', 'units')
      .where('s.companyId = :companyId', { companyId })
      .groupBy('s.storeId')
      .getRawMany();

    const adsRows = await this.adsRepo
      .createQueryBuilder('a')
      .select('a.storeId', 'storeId')
      .addSelect('COALESCE(SUM(a.adSpend), 0)', 'adSpend')
      .addSelect('COALESCE(SUM(a.adRevenue), 0)', 'adRevenue')
      .where('a.companyId = :companyId', { companyId })
      .groupBy('a.storeId')
      .getRawMany();

    const adsMap = new Map<string, { adSpend: number; adRevenue: number }>();
    for (const row of adsRows) {
      adsMap.set(row.storeId as string, {
        adSpend: Number(row.adSpend) || 0,
        adRevenue: Number(row.adRevenue) || 0,
      });
    }

    return salesRows.map((r: Record<string, unknown>) => {
      const storeId = r.storeId as string;
      const revenue = Number(r.revenue) || 0;
      const ads = adsMap.get(storeId) || { adSpend: 0, adRevenue: 0 };
      const tacos = revenue > 0 ? Math.round((ads.adSpend / revenue) * 10000) / 100 : 0;
      return {
        storeId,
        revenue,
        units: Number(r.units) || 0,
        adSpend: ads.adSpend,
        adRevenue: ads.adRevenue,
        tacos,
      };
    });
  }

  async getProductPerformance(companyId: string, query: { skuId?: string; storeId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const qb = this.perfRepo
      .createQueryBuilder('p')
      .where('p.companyId = :companyId', { companyId });

    if (query.skuId) qb.andWhere('p.skuId = :skuId', { skuId: query.skuId });
    if (query.storeId) qb.andWhere('p.storeId = :storeId', { storeId: query.storeId });
    if (query.startDate) qb.andWhere('p.reportDate >= :startDate', { startDate: query.startDate });
    if (query.endDate) qb.andWhere('p.reportDate <= :endDate', { endDate: query.endDate });

    qb.orderBy('p.reportDate', 'DESC');

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data: items, total, page, pageSize };
  }

  // ---------------------------------------------------------------------------
  // Enhanced Link Analysis (ported from Ke/ Django _build_link_analysis_rows)
  // ---------------------------------------------------------------------------

  async getEnhancedLinkAnalysis(
    companyId: string,
    params: {
      reportDate?: string;
      storeName?: string;
      platform?: string;
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 300);

    // --- 1. Determine report date (default today, fallback yesterday) ---
    let reportDate = params.reportDate;
    if (!reportDate) {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const hasToday = await this.pprRepo
        .createQueryBuilder('p')
        .where('p.companyId = :companyId AND p.reportDate = :rd', {
          companyId,
          rd: todayStr,
        })
        .getCount();
      if (hasToday > 0) {
        reportDate = todayStr;
      } else {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        reportDate = yesterday.toISOString().slice(0, 10);
      }
    }

    // --- 2. Get unique (variationSku, storeName, reportDate) keys from PPR ---
    const keysQb = this.pprRepo
      .createQueryBuilder('p')
      .select('DISTINCT p.variationSku', 'variationSku')
      .addSelect('p.storeName', 'storeName')
      .addSelect('p.reportDate', 'reportDate')
      .addSelect('p.globalSku', 'globalSku')
      .addSelect('p.skuCode', 'skuCode')
      .addSelect('p.productName', 'productName')
      .where('p.companyId = :companyId AND p.reportDate = :reportDate', {
        companyId,
        reportDate,
      });

    if (params.storeName) {
      keysQb.andWhere('LOWER(TRIM(p.storeName)) = LOWER(TRIM(:storeName))', {
        storeName: params.storeName,
      });
    }
    if (params.platform) {
      keysQb.andWhere('LOWER(TRIM(p.platform)) = LOWER(TRIM(:platform))', {
        platform: params.platform,
      });
    }
    if (params.keyword) {
      keysQb.andWhere(
        '(p.skuCode ILIKE :kw OR p.productName ILIKE :kw OR p.variationSku ILIKE :kw)',
        { kw: `%${params.keyword}%` },
      );
    }

    const rawKeys = await keysQb.getRawMany();

    // Group by (variationSku, storeName, reportDate), collect skuCodes
    interface KeyGroup {
      variationSku: string;
      storeName: string;
      reportDate: string;
      globalSku: string;
      skuCodes: string[];
      productName: string;
    }
    const groupMap = new Map<string, KeyGroup>();

    for (const r of rawKeys) {
      const varSku = (r.variationSku || '').trim();
      const store = (r.storeName || '').trim();
      const rd = (r.reportDate || '').trim();
      const compositeKey = `${varSku}|${store}|${rd}`;
      if (!groupMap.has(compositeKey)) {
        groupMap.set(compositeKey, {
          variationSku: varSku,
          storeName: store,
          reportDate: rd,
          globalSku: (r.globalSku || '').trim(),
          skuCodes: [],
          productName: (r.productName || '').trim(),
        });
      }
      const g = groupMap.get(compositeKey)!;
      const sc = (r.skuCode || '').trim();
      if (sc && !g.skuCodes.includes(sc)) g.skuCodes.push(sc);
      if (!g.globalSku && r.globalSku) g.globalSku = (r.globalSku || '').trim();
      if (!g.productName && r.productName)
        g.productName = (r.productName || '').trim();
    }

    // Apply the "-" rule: if variationSku is "-" and same store+date+globalSku
    // has other entries, skip it
    const globalSkuCount = new Map<string, number>();
    for (const g of groupMap.values()) {
      if (g.globalSku) {
        const gk = `${g.storeName}|${g.reportDate}|${g.globalSku}`;
        globalSkuCount.set(gk, (globalSkuCount.get(gk) || 0) + 1);
      }
    }

    let keysList: KeyGroup[] = [];
    for (const g of groupMap.values()) {
      if (g.variationSku === '-' || g.variationSku === '') {
        if (g.globalSku) {
          const gk = `${g.storeName}|${g.reportDate}|${g.globalSku}`;
          if ((globalSkuCount.get(gk) || 0) > 1) continue;
        }
      }
      keysList.push(g);
    }

    keysList.sort((a, b) =>
      `${a.variationSku}|${a.storeName}`.localeCompare(
        `${b.variationSku}|${b.storeName}`,
      ),
    );

    const total = keysList.length;
    const pageKeys = keysList.slice((page - 1) * pageSize, page * pageSize);
    if (pageKeys.length === 0) {
      return {
        data: [],
        total,
        page,
        pageSize,
        reportDate,
        dateColumns: generateSevenDates().map((d) => ({
          key: 'd_' + d.replace(/-/g, '_'),
          label: d,
        })),
      };
    }

    // --- 3. Build 7-day date columns ---
    const baseDate = new Date(reportDate + 'T00:00:00');
    const sevenDates = generateSevenDates(baseDate);
    const allDateValues = [reportDate, ...sevenDates];

    // Collect all skuCodes and stores for batch queries
    const allSkuCodes = new Set<string>();
    const allStores = new Set<string>();
    const allVariationSkus = new Set<string>();
    for (const k of pageKeys) {
      k.skuCodes.forEach((c) => allSkuCodes.add(c));
      allStores.add(k.storeName);
      if (k.variationSku) allVariationSkus.add(k.variationSku);
    }

    // --- 4. Batch query: 7-day quantities from PPR ---
    const qtyMap = new Map<string, number>();
    const salesAmountMap = new Map<string, number>();
    if (allSkuCodes.size > 0 && allStores.size > 0) {
      const qtyRows = await this.pprRepo
        .createQueryBuilder('p')
        .select('p.skuCode', 'skuCode')
        .addSelect('p.storeName', 'storeName')
        .addSelect('p.reportDate', 'reportDate')
        .addSelect('COALESCE(SUM(p.quantity), 0)', 'qty')
        .addSelect('COALESCE(SUM(p.salesAmount), 0)', 'salesAmt')
        .where('p.companyId = :companyId', { companyId })
        .andWhere('p.skuCode IN (:...skuCodes)', {
          skuCodes: [...allSkuCodes],
        })
        .andWhere('p.storeName IN (:...stores)', {
          stores: [...allStores],
        })
        .andWhere('p.reportDate IN (:...dates)', {
          dates: [...new Set(allDateValues)],
        })
        .groupBy('p.skuCode')
        .addGroupBy('p.storeName')
        .addGroupBy('p.reportDate')
        .getRawMany();

      for (const row of qtyRows) {
        const key = `${row.skuCode}|${row.storeName}|${row.reportDate}`;
        qtyMap.set(key, safeInt(row.qty));
        salesAmountMap.set(
          key,
          (salesAmountMap.get(key) || 0) + safeFloat(row.salesAmt),
        );
      }
    }

    // --- 5. Promotion spend from PromotionFeeReportEntity ---
    const spendMap = new Map<string, number>();
    if (allSkuCodes.size > 0 && allStores.size > 0) {
      const spendRows = await this.promoFeeRepo
        .createQueryBuilder('pf')
        .select('pf.skuCode', 'skuCode')
        .addSelect('pf.storeName', 'storeName')
        .addSelect('pf.reportDate', 'reportDate')
        .addSelect('COALESCE(SUM(pf.promotionFee), 0)', 'totalSpend')
        .where('pf.companyId = :companyId', { companyId })
        .andWhere('pf.skuCode IN (:...skuCodes)', {
          skuCodes: [...allSkuCodes],
        })
        .andWhere('pf.storeName IN (:...stores)', {
          stores: [...allStores],
        })
        .andWhere('pf.reportDate = :reportDate', { reportDate })
        .groupBy('pf.skuCode')
        .addGroupBy('pf.storeName')
        .addGroupBy('pf.reportDate')
        .getRawMany();

      for (const row of spendRows) {
        const key = `${row.skuCode}|${row.storeName}|${row.reportDate}`;
        spendMap.set(key, safeFloat(row.totalSpend));
      }
    }

    // --- 6. Inventory (latest report) ---
    const invMap = new Map<string, number>();
    if (allVariationSkus.size > 0) {
      // Find the closest report_date to today
      const latestInvDate = await this.invReportRepo
        .createQueryBuilder('ir')
        .select('MAX(ir.reportDate)', 'maxDate')
        .where('ir.companyId = :companyId', { companyId })
        .andWhere('ir.skuCode IN (:...skus)', {
          skus: [...allVariationSkus],
        })
        .getRawOne();

      if (latestInvDate?.maxDate) {
        const invRows = await this.invReportRepo
          .createQueryBuilder('ir')
          .select('ir.skuCode', 'skuCode')
          .addSelect('COALESCE(SUM(ir.availableStock), 0)', 'totalStock')
          .where('ir.companyId = :companyId', { companyId })
          .andWhere('ir.skuCode IN (:...skus)', {
            skus: [...allVariationSkus],
          })
          .andWhere('ir.reportDate = :rd', { rd: latestInvDate.maxDate })
          .groupBy('ir.skuCode')
          .getRawMany();

        for (const row of invRows) {
          invMap.set(row.skuCode, safeInt(row.totalStock));
        }
      }
    }

    // --- 7. Store -> main promoter mapping ---
    const promoterMap = new Map<string, string>();
    if (allStores.size > 0) {
      const promoterRows = await this.storePromoterRepo.find({
        where: {
          companyId,
          isPrimary: true,
        },
      });
      for (const row of promoterRows) {
        const sn = (row.storeName || '').trim();
        if (sn && !promoterMap.has(sn)) {
          promoterMap.set(sn, (row.promoterName || '').trim());
        }
      }
    }

    // --- 8. Build rows ---
    const dateColumns = sevenDates.map((d) => ({
      key: 'd_' + d.replace(/-/g, '_'),
      label: d,
    }));

    const rows = pageKeys.map((k) => {
      // Promotion spend for this link
      let spend = 0;
      for (const sc of k.skuCodes) {
        spend += spendMap.get(`${sc}|${k.storeName}|${k.reportDate}`) || 0;
      }

      // Daily sales amount (today's report date)
      let dailySales = 0;
      for (const sc of k.skuCodes) {
        dailySales +=
          salesAmountMap.get(`${sc}|${k.storeName}|${k.reportDate}`) || 0;
      }

      // 7-day trend
      let sevenDayQty = 0;
      const sevenDayTrend = sevenDates.map((dateStr) => {
        let qty = 0;
        for (const sc of k.skuCodes) {
          qty += qtyMap.get(`${sc}|${k.storeName}|${dateStr}`) || 0;
        }
        sevenDayQty += qty;
        return { date: dateStr, quantity: qty };
      });

      // Inventory & days of sale
      const availableStock = invMap.get(k.variationSku) ?? null;
      const daysOfSale =
        availableStock !== null
          ? calculateDaysOfSale(availableStock, sevenDayQty)
          : null;

      // IFS profit (simplified: use price = 100 default as in Django when unknown)
      const price = 100;
      let totalOrders = 0;
      let totalSalesForProfit = 0;
      for (const sc of k.skuCodes) {
        for (const dateStr of [k.reportDate]) {
          totalOrders += qtyMap.get(`${sc}|${k.storeName}|${dateStr}`) || 0;
          totalSalesForProfit +=
            salesAmountMap.get(`${sc}|${k.storeName}|${dateStr}`) || 0;
        }
      }
      const ifsProfit = calculateIfsProfit(
        price,
        totalOrders,
        totalSalesForProfit,
      );
      // Simplified cost deduction (no per-SKU cost data in new system yet)
      const costDeduction =
        totalOrders * (0 + 2.5) + totalSalesForProfit * 0.02;
      const profit = Math.round((ifsProfit - costDeduction - spend) * 100) / 100;

      return {
        id: `${k.variationSku}|${k.storeName}|${k.reportDate}`,
        reportDate: k.reportDate,
        storeName: k.storeName,
        skuCode: k.variationSku,
        parentSku: k.globalSku,
        productName: k.productName,
        mainPromoter: promoterMap.get(k.storeName.trim()) || '',
        availableStock,
        dailySales: dailySales || null,
        sevenDayTrend,
        daysOfSale,
        promotionSpend: Math.round(spend * 100) / 100,
        profit,
      };
    });

    return {
      data: rows,
      total,
      page,
      pageSize,
      reportDate,
      dateColumns,
    };
  }

  // ---------------------------------------------------------------------------
  // Link Analysis Detail
  // ---------------------------------------------------------------------------

  async getLinkAnalysisDetail(
    companyId: string,
    params: {
      skuCode: string;
      storeName: string;
      reportDate: string;
    },
  ) {
    const { skuCode, storeName, reportDate } = params;

    // 1. Link status from promotion fee report
    const linkRow = await this.promoFeeRepo.findOne({
      where: {
        companyId,
        reportDate,
        storeName,
        skuCode,
      },
    });
    const linkStatus = linkRow?.status || null;

    // 2. All PPR rows for this sku_code + store + date
    const pprAll = await this.pprRepo.find({
      where: {
        companyId,
        reportDate,
        storeName,
        skuCode,
      },
    });

    // 3. PPR rows where variationSku is "-" or empty (aggregate row)
    const pprSummaryRows = pprAll.filter(
      (p) => !p.variationSku || p.variationSku.trim() === '-' || p.variationSku.trim() === '',
    );

    const pprDetails = pprSummaryRows.map((ppr) => ({
      cartQuantity: ppr.cartQuantity ?? null,
      cartConversionRate: ppr.cartConversionRate
        ? safeFloat(ppr.cartConversionRate)
        : null,
      bounceRate: ppr.bounceRate ? safeFloat(ppr.bounceRate) : null,
      itemStatus: ppr.itemStatus || null,
      variationStatus: ppr.variationStatus || null,
    }));

    // 4. Collect unique variation SKUs for status lookup
    const variationSkus = new Set<string>();
    for (const ppr of pprAll) {
      const vs = (ppr.variationSku || '').trim();
      variationSkus.add(vs && vs !== '-' ? vs : skuCode);
    }

    // 5. Promotion campaigns for this link
    const campaigns = await this.promoFeeRepo.find({
      where: {
        companyId,
        reportDate,
        storeName,
        skuCode,
      },
    });

    const campaignDetails = campaigns.map((c) => ({
      campaignName: c.campaignName,
      adType: c.adType,
      status: c.status,
      promotionFee: safeFloat(c.promotionFee),
      impressions: c.impressions,
      clicks: c.clicks,
      orders: c.orders,
      salesAmount: safeFloat(c.salesAmount),
      roas: c.roas ? safeFloat(c.roas) : null,
    }));

    // 6. Profit breakdown
    let totalSales = 0;
    let totalOrders = 0;
    for (const ppr of pprAll) {
      const vs = (ppr.variationSku || '').trim();
      // Skip "-" row if there are other rows (same logic as Django)
      if ((!vs || vs === '-') && pprAll.length > 1) continue;
      totalSales += safeFloat(ppr.salesAmount);
      totalOrders += safeInt(ppr.quantity);
    }

    const price = 100; // default price tier
    const ifsProfit = calculateIfsProfit(price, totalOrders, totalSales);
    const totalSpend = campaigns.reduce(
      (sum, c) => sum + safeFloat(c.promotionFee),
      0,
    );
    const costDeduction = totalOrders * (0 + 2.5) + totalSales * 0.02;
    const profit =
      Math.round((ifsProfit - costDeduction - totalSpend) * 100) / 100;

    return {
      linkStatus,
      skuVariations: [...variationSkus].sort(),
      pprDetails,
      campaignDetails,
      profitBreakdown: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalOrders,
        ifsProfit: Math.round(ifsProfit * 100) / 100,
        costDeduction: Math.round(costDeduction * 100) / 100,
        promotionSpend: Math.round(totalSpend * 100) / 100,
        netProfit: profit,
      },
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
