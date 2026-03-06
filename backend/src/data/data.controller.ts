import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DataService } from './data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { CreateSkuDto } from './dto/create-sku.dto';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import { QuerySkuDto } from './dto/query-sku.dto';

@ApiTags('Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  // ===== Store =====
  @Post('stores')
  @ApiOperation({ summary: 'Create store' })
  createStore(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateStoreDto,
  ) {
    return this.dataService.createStore(companyId, dto);
  }

  @Get('stores')
  @ApiOperation({ summary: 'List stores' })
  getStores(@CurrentUser('companyId') companyId: string) {
    return this.dataService.getStores(companyId);
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Get store by ID' })
  getStore(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.dataService.getStoreById(companyId, id);
  }

  @Patch('stores/:id')
  @ApiOperation({ summary: 'Update store' })
  updateStore(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.dataService.updateStore(companyId, id, dto);
  }

  @Delete('stores/:id')
  @ApiOperation({ summary: 'Delete store' })
  deleteStore(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.dataService.deleteStore(companyId, id);
  }

  // ===== Site =====
  @Post('sites')
  @ApiOperation({ summary: 'Create site' })
  createSite(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateSiteDto,
  ) {
    return this.dataService.createSite(companyId, dto);
  }

  @Get('sites')
  @ApiOperation({ summary: 'List sites' })
  getSites(@CurrentUser('companyId') companyId: string) {
    return this.dataService.getSites(companyId);
  }

  // ===== Binding =====
  @Post('stores/:storeId/sites/:siteId/bind')
  @ApiOperation({ summary: 'Bind store to site' })
  bindStoreSite(
    @CurrentUser('companyId') companyId: string,
    @Param('storeId') storeId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.dataService.bindStoreSite(companyId, storeId, siteId);
  }

  // ===== SKU =====
  @Post('skus')
  @ApiOperation({ summary: 'Create SKU' })
  createSku(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateSkuDto,
  ) {
    return this.dataService.createSku(companyId, dto);
  }

  @Get('skus')
  @ApiOperation({ summary: 'Query SKUs with pagination and filters' })
  querySkus(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QuerySkuDto,
  ) {
    return this.dataService.querySkus(companyId, query);
  }

  @Get('skus/:id')
  @ApiOperation({ summary: 'Get SKU by ID' })
  getSku(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.dataService.getSkuById(companyId, id);
  }

  @Patch('skus/:id')
  @ApiOperation({ summary: 'Update SKU' })
  updateSku(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSkuDto,
  ) {
    return this.dataService.updateSku(companyId, id, dto);
  }

  @Delete('skus/:id')
  @ApiOperation({ summary: 'Delete SKU' })
  deleteSku(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.dataService.deleteSku(companyId, id);
  }

  // ===== Competitor =====
  @Post('competitors')
  @ApiOperation({ summary: 'Create competitor' })
  createCompetitor(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateCompetitorDto,
  ) {
    return this.dataService.createCompetitor(companyId, dto);
  }

  @Get('competitors')
  @ApiOperation({ summary: 'List competitors' })
  getCompetitors(@CurrentUser('companyId') companyId: string) {
    return this.dataService.getCompetitors(companyId);
  }

  // ===== Metric Defs =====
  @Get('metric-defs')
  @ApiOperation({ summary: 'List metric definitions with versions' })
  getMetricDefs(@CurrentUser('companyId') companyId: string) {
    return this.dataService.getMetricDefs(companyId);
  }

  @Post('metric-defs/:metricDefId/versions')
  @ApiOperation({ summary: 'Create new metric definition version' })
  createMetricDefVersion(
    @CurrentUser('companyId') companyId: string,
    @Param('metricDefId') metricDefId: string,
    @Body() body: { formula: string; changelog: string },
  ) {
    return this.dataService.createMetricDefVersion(
      companyId,
      metricDefId,
      body.formula,
      body.changelog,
    );
  }

  // ===== Thresholds =====
  @Put('thresholds')
  @ApiOperation({ summary: 'Upsert threshold configuration' })
  upsertThreshold(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateThresholdDto,
  ) {
    return this.dataService.upsertThreshold(companyId, dto);
  }

  @Get('thresholds')
  @ApiOperation({ summary: 'List all thresholds' })
  getThresholds(@CurrentUser('companyId') companyId: string) {
    return this.dataService.getThresholds(companyId);
  }
}
