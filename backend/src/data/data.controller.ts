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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Get('skus/:skuId/platform-prices')
  @ApiOperation({ summary: 'Get platform prices for a SKU' })
  async getPlatformPrices(
    @CurrentUser('companyId') companyId: string,
    @Param('skuId') skuId: string,
  ) {
    const data = await this.dataService.getPlatformPrices(skuId, companyId);
    return { code: 0, data };
  }

  @Put('skus/:skuId/platform-prices/:platform')
  @ApiOperation({ summary: 'Upsert platform price for a SKU' })
  async upsertPlatformPrice(
    @CurrentUser('companyId') companyId: string,
    @Param('skuId') skuId: string,
    @Param('platform') platform: string,
    @Body() body: any,
  ) {
    const data = await this.dataService.upsertPlatformPrice(
      platform,
      skuId,
      companyId,
      body,
    );
    return { code: 0, message: '保存成功', data };
  }

  @Get('skus/:skuId/competitors')
  @ApiOperation({ summary: 'Get competitors for a SKU' })
  async getSkuCompetitors(
    @CurrentUser('companyId') companyId: string,
    @Param('skuId') skuId: string,
  ) {
    const data = await this.dataService.getSkuCompetitors(skuId, companyId);
    return { code: 0, data };
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

  @Get('competitors/:id/snapshots')
  @ApiOperation({ summary: 'Get competitor snapshots' })
  async getCompetitorSnapshots(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const data = await this.dataService.getCompetitorSnapshots(
      id,
      companyId,
      daysNum,
    );
    return { code: 0, data };
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

  // ===== Product Image =====
  @Post('skus/:skuId/image')
  @ApiOperation({ summary: 'Upload product image' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSkuImage(
    @CurrentUser('companyId') companyId: string,
    @Param('skuId') skuId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Store file and get URL (in production use cloud storage)
    const imageUrl = `/uploads/products/${Date.now()}-${file.originalname}`;
    const data = await this.dataService.updateSkuImage(companyId, skuId, imageUrl);
    return { code: 0, message: '图片上传成功', data };
  }

  // ===== Store Promoter Mapping =====
  @Get('store-promoter-mappings')
  @ApiOperation({ summary: 'List store-promoter mappings' })
  async getStorePromoterMappings(@CurrentUser('companyId') companyId: string) {
    const data = await this.dataService.getStorePromoterMappings(companyId);
    return { code: 0, data };
  }

  @Post('store-promoter-mappings')
  @ApiOperation({ summary: 'Create/update store-promoter mapping' })
  async upsertStorePromoterMapping(
    @CurrentUser('companyId') companyId: string,
    @Body() body: { storeName: string; userId: string; promoterName: string; isPrimary?: boolean },
  ) {
    const data = await this.dataService.upsertStorePromoterMapping(
      companyId,
      body.storeName,
      body.userId,
      body.promoterName,
      body.isPrimary ?? true,
    );
    return { code: 0, message: '保存成功', data };
  }

  @Delete('store-promoter-mappings/:id')
  @ApiOperation({ summary: 'Delete store-promoter mapping' })
  async deleteStorePromoterMapping(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const data = await this.dataService.deleteStorePromoterMapping(companyId, id);
    return { code: 0, ...data };
  }
}
