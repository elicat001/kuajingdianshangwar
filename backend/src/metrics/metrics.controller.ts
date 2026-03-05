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

  @Get('snapshots')
  @ApiOperation({ summary: 'Query metric snapshots with pagination' })
  querySnapshots(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryMetricsDto,
  ) {
    return this.metricsService.queryMetrics(companyId, query);
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
