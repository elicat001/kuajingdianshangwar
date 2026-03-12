import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryMetricsDto } from './dto/query-metrics.dto';
import { WarRoomQueryDto } from './dto/war-room-query.dto';

@ApiTags('Metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('war-room')
  @ApiOperation({ summary: 'Get War Room aggregated metrics' })
  getWarRoom(
    @CurrentUser('companyId') companyId: string,
    @Query() query: WarRoomQueryDto,
  ) {
    return this.metricsService.getWarRoomMetrics(companyId, query);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get sales and ads trend data for charts' })
  getTrends(
    @CurrentUser('companyId') companyId: string,
    @Query('days') days?: string,
  ) {
    return this.metricsService.getTrends(companyId, parseInt(days || '7', 10));
  }

  @Get('category-sales')
  @ApiOperation({ summary: 'Get sales distribution by site/category' })
  getCategorySales(@CurrentUser('companyId') companyId: string) {
    return this.metricsService.getCategorySales(companyId);
  }

  @Get('platform-comparison')
  @ApiOperation({ summary: 'Get cross-platform store comparison' })
  getPlatformComparison(@CurrentUser('companyId') companyId: string) {
    return this.metricsService.getPlatformComparison(companyId);
  }

  @Get('snapshots')
  @ApiOperation({ summary: 'Query metric snapshots with pagination' })
  querySnapshots(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryMetricsDto,
  ) {
    return this.metricsService.queryMetrics(companyId, query);
  }

  @Get('product-performance')
  @ApiOperation({ summary: 'Query product performance data' })
  getProductPerformance(
    @CurrentUser('companyId') companyId: string,
    @Query('skuId') skuId?: string,
    @Query('storeId') storeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.metricsService.getProductPerformance(companyId, {
      skuId, storeId, startDate, endDate,
      page: parseInt(page || '1', 10),
      pageSize: parseInt(pageSize || '20', 10),
    });
  }

  @Get('link-analysis')
  @ApiOperation({ summary: 'Get link-level ROI/profit analysis' })
  getLinkAnalysis(
    @CurrentUser('companyId') companyId: string,
    @Query('storeId') storeId?: string,
    @Query('siteId') siteId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.metricsService.getLinkAnalysis(companyId, {
      storeId, siteId, startDate, endDate,
      page: parseInt(page || '1', 10),
      pageSize: parseInt(pageSize || '20', 10),
    });
  }

  @Get('link-analysis-enhanced')
  @ApiOperation({ summary: 'Enhanced link analysis with IFS profit & 7-day trend' })
  getEnhancedLinkAnalysis(
    @CurrentUser('companyId') companyId: string,
    @Query('reportDate') reportDate?: string,
    @Query('storeName') storeName?: string,
    @Query('platform') platform?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.metricsService.getEnhancedLinkAnalysis(companyId, {
      reportDate,
      storeName,
      platform,
      keyword,
      page: parseInt(page || '1', 10),
      pageSize: parseInt(pageSize || '20', 10),
    });
  }

  @Get('link-analysis-detail')
  @ApiOperation({ summary: 'Link analysis detail for a specific SKU/store/date' })
  getLinkAnalysisDetail(
    @CurrentUser('companyId') companyId: string,
    @Query('skuCode') skuCode: string,
    @Query('storeName') storeName: string,
    @Query('reportDate') reportDate: string,
  ) {
    return this.metricsService.getLinkAnalysisDetail(companyId, {
      skuCode,
      storeName,
      reportDate,
    });
  }

  @Get('sku/:skuId')
  @ApiOperation({ summary: 'Get SKU-level metrics summary' })
  getSkuMetrics(
    @CurrentUser('companyId') companyId: string,
    @Param('skuId') skuId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.metricsService.getSkuMetrics(companyId, skuId, startDate, endDate);
  }
}
