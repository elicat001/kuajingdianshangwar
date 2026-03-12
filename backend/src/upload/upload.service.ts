import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { DataUploadEntity } from './entities/data-upload.entity';
// New report entities
import { SkuSalesReportEntity } from '../metrics/entities/sku-sales-report.entity';
import { InventoryReportEntity } from '../metrics/entities/inventory-report.entity';
import { PromotionFeeReportEntity } from '../metrics/entities/promotion-fee-report.entity';
import { ProductPerformanceReportEntity } from '../metrics/entities/product-performance-report.entity';
// Backward-compat fact entities
import { SalesFactEntity } from '../metrics/entities/sales-fact.entity';
import { AdsFactEntity } from '../metrics/entities/ads-fact.entity';
import { InventoryFactEntity } from '../metrics/entities/inventory-fact.entity';
import { ProductPerformanceEntity } from '../metrics/entities/product-performance.entity';
// SKU Master
import { SkuMasterEntity } from '../data/entities/sku-master.entity';
// Importers
import {
  BaseImporter,
  SalesReportImporter,
  InventoryReportImporter,
  PromotionFeeImporter,
  ProductPerformanceImporter,
  ProductInfoImporter,
} from './importers';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  /** Registry: dataType -> importer instance */
  private readonly importerRegistry: Map<string, BaseImporter>;

  constructor(
    @InjectRepository(DataUploadEntity) private uploadRepo: Repository<DataUploadEntity>,
    // Report repos
    @InjectRepository(SkuSalesReportEntity) private salesReportRepo: Repository<SkuSalesReportEntity>,
    @InjectRepository(InventoryReportEntity) private inventoryReportRepo: Repository<InventoryReportEntity>,
    @InjectRepository(PromotionFeeReportEntity) private promotionFeeReportRepo: Repository<PromotionFeeReportEntity>,
    @InjectRepository(ProductPerformanceReportEntity) private perfReportRepo: Repository<ProductPerformanceReportEntity>,
    // Fact repos (backward compat)
    @InjectRepository(SalesFactEntity) private salesFactRepo: Repository<SalesFactEntity>,
    @InjectRepository(AdsFactEntity) private adsFactRepo: Repository<AdsFactEntity>,
    @InjectRepository(InventoryFactEntity) private inventoryFactRepo: Repository<InventoryFactEntity>,
    @InjectRepository(ProductPerformanceEntity) private perfRepo: Repository<ProductPerformanceEntity>,
    // SKU Master
    @InjectRepository(SkuMasterEntity) private skuMasterRepo: Repository<SkuMasterEntity>,
    // Importers
    private readonly salesReportImporter: SalesReportImporter,
    private readonly inventoryReportImporter: InventoryReportImporter,
    private readonly promotionFeeImporter: PromotionFeeImporter,
    private readonly productPerformanceImporter: ProductPerformanceImporter,
    private readonly productInfoImporter: ProductInfoImporter,
  ) {
    this.importerRegistry = new Map<string, BaseImporter>([
      ['sales_report', this.salesReportImporter],
      ['inventory_report', this.inventoryReportImporter],
      ['promotion_fee', this.promotionFeeImporter],
      ['product_performance', this.productPerformanceImporter],
      ['product_info', this.productInfoImporter],
    ]);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getUploads(companyId: string, page = 1, pageSize = 20) {
    const [data, total] = await this.uploadRepo.findAndCount({
      where: { companyId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total, page, pageSize };
  }

  // ---------------------------------------------------------------------------
  // Excel file upload
  // ---------------------------------------------------------------------------

  async processUpload(
    file: Express.Multer.File,
    dataType: string,
    companyId: string,
    userId: string,
    meta: { storeId?: string; siteId?: string; reportDate?: string },
  ) {
    const upload = this.uploadRepo.create({
      companyId,
      filename: file.originalname,
      dataType,
      status: 'processing',
      createdBy: userId,
    });
    await this.uploadRepo.save(upload);

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      let sheetName = workbook.SheetNames[0];
      let rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      // If the active sheet is nearly empty, try other sheets (like the Django code does)
      if ((rows.length <= 1 || Object.keys(rows[0] || {}).length <= 1) && workbook.SheetNames.length > 1) {
        for (const name of workbook.SheetNames) {
          if (name === sheetName) continue;
          const otherRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
          if (otherRows.length > rows.length && Object.keys(otherRows[0] || {}).length > 1) {
            rows = otherRows;
            sheetName = name;
            this.logger.log(`Switched to sheet "${name}" with ${otherRows.length} rows`);
            break;
          }
        }
      }

      // For promotion_fee: the header row might not be row 1.
      // XLSX.utils.sheet_to_json by default uses row 1 as headers.
      // If we detect that promotion_fee has no recognized columns, re-parse
      // by scanning for the real header row.
      if (dataType === 'promotion_fee' && rows.length > 0) {
        const firstRowKeys = Object.keys(rows[0]);
        const markers = PromotionFeeImporter.HEADER_ROW_MARKERS;
        const hasKnownHeader = firstRowKeys.some(k =>
          markers.some(m => k.includes(m) || m.includes(k)),
        );
        if (!hasKnownHeader) {
          // Re-parse: scan raw sheet data for the header row
          const sheet = workbook.Sheets[sheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          let headerIdx = 0;
          for (let i = 0; i < Math.min(20, rawRows.length); i++) {
            const cells = (rawRows[i] || []).map(String);
            if (cells.some(c => markers.some(m => c.includes(m) || m.includes(c)))) {
              headerIdx = i;
              break;
            }
          }
          if (headerIdx > 0) {
            rows = XLSX.utils.sheet_to_json(sheet, { range: headerIdx });
            this.logger.log(`Promotion fee: detected header at row ${headerIdx + 1}`);
          }
        }
      }

      if (rows.length === 0) {
        throw new BadRequestException('Excel文件为空');
      }

      const fullMeta = { ...meta, filename: file.originalname };
      const importedCount = await this.dispatchImport(dataType, rows, companyId, fullMeta);

      upload.status = 'completed';
      upload.rowCount = importedCount;
      upload.message = `成功导入 ${importedCount} 条记录`;
      await this.uploadRepo.save(upload);
      return upload;
    } catch (err: any) {
      upload.status = 'failed';
      upload.message = err.message || '导入失败';
      await this.uploadRepo.save(upload);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // JSON body upload (for Feishu Bitable / product_info)
  // ---------------------------------------------------------------------------

  async processJsonUpload(
    dataType: string,
    items: any[],
    companyId: string,
    userId: string,
    meta: { storeId?: string; siteId?: string; skipExisting?: boolean },
  ) {
    const upload = this.uploadRepo.create({
      companyId,
      filename: `json_upload_${dataType}_${Date.now()}`,
      dataType,
      status: 'processing',
      createdBy: userId,
    });
    await this.uploadRepo.save(upload);

    try {
      if (dataType !== 'product_info') {
        throw new BadRequestException('JSON upload is only supported for product_info');
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new BadRequestException('items must be a non-empty array');
      }

      const { skuEntities } = this.productInfoImporter.parseJsonItems(items, companyId, meta);
      const { created, updated, skipped } = await this.upsertSkuMaster(skuEntities, meta.skipExisting);

      upload.status = 'completed';
      upload.rowCount = created + updated;
      upload.message = `新增 ${created}, 更新 ${updated}, 跳过 ${skipped}`;
      await this.uploadRepo.save(upload);
      return upload;
    } catch (err: any) {
      upload.status = 'failed';
      upload.message = err.message || '导入失败';
      await this.uploadRepo.save(upload);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Central dispatch
  // ---------------------------------------------------------------------------

  private async dispatchImport(
    dataType: string,
    rows: Record<string, any>[],
    companyId: string,
    meta: any,
  ): Promise<number> {
    const importer = this.importerRegistry.get(dataType);
    if (!importer) {
      throw new BadRequestException(`不支持的数据类型: ${dataType}`);
    }

    if (dataType === 'product_info') {
      // Product info Excel import
      const { skuEntities } = importer.parseRows(rows, companyId, meta) as { skuEntities: any[] };
      const { created, updated } = await this.upsertSkuMaster(skuEntities, false);
      return created + updated;
    }

    const result = importer.parseRows(rows, companyId, meta);

    switch (dataType) {
      case 'sales_report': {
        const { reportEntities, factEntities } = result as { reportEntities: any[]; factEntities: any[] };
        if (reportEntities.length > 0) {
          await this.bulkSave(this.salesReportRepo, reportEntities);
        }
        if (factEntities.length > 0) {
          await this.bulkSave(this.salesFactRepo, factEntities);
        }
        return reportEntities.length;
      }

      case 'inventory_report': {
        const { reportEntities, factEntities } = result as { reportEntities: any[]; factEntities: any[] };
        if (reportEntities.length > 0) {
          await this.bulkSave(this.inventoryReportRepo, reportEntities);
        }
        if (factEntities.length > 0) {
          await this.bulkSave(this.inventoryFactRepo, factEntities);
        }
        return reportEntities.length;
      }

      case 'promotion_fee': {
        const { reportEntities, factEntities } = result as { reportEntities: any[]; factEntities: any[] };
        if (reportEntities.length > 0) {
          await this.bulkSave(this.promotionFeeReportRepo, reportEntities);
        }
        if (factEntities.length > 0) {
          await this.bulkSave(this.adsFactRepo, factEntities);
        }
        return reportEntities.length;
      }

      case 'product_performance': {
        const { reportEntities, factEntities } = result as { reportEntities: any[]; factEntities: any[] };
        if (reportEntities.length > 0) {
          await this.bulkSave(this.perfReportRepo, reportEntities);
        }
        if (factEntities.length > 0) {
          await this.bulkSave(this.perfRepo, factEntities);
        }
        return reportEntities.length;
      }

      default:
        throw new BadRequestException(`不支持的数据类型: ${dataType}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Save entities in batches to avoid hitting DB parameter limits.
   */
  private async bulkSave<T extends Record<string, any>>(repo: Repository<T>, entities: any[], batchSize = 500): Promise<void> {
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const created = batch.map(e => repo.create(e as any));
      await repo.save(created as any);
    }
  }

  /**
   * Upsert SKU Master records: create new ones, update existing ones.
   */
  private async upsertSkuMaster(
    skuEntities: any[],
    skipExisting = false,
  ): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const data of skuEntities) {
      const existing = await this.skuMasterRepo.findOne({
        where: { companyId: data.companyId, sku: data.sku },
      });

      if (existing) {
        if (skipExisting) {
          skipped++;
          continue;
        }
        // Update existing fields (only non-null values)
        if (data.title) existing.title = data.title;
        if (data.imageUrl) existing.imageUrl = data.imageUrl;
        if (data.purchasePrice != null) existing.purchasePrice = data.purchasePrice;
        if (data.cost != null) existing.cost = data.cost;
        if (data.shippingCost != null) existing.shippingCost = data.shippingCost;
        if (data.weight != null) existing.weight = data.weight;
        if (data.boxSize) existing.boxSize = data.boxSize;
        if (data.packPerBox != null) existing.packPerBox = data.packPerBox;
        if (data.exchangeRate != null) existing.exchangeRate = data.exchangeRate;
        if (data.promoter) existing.promoter = data.promoter;
        if (data.attributes) {
          existing.attributes = { ...(existing.attributes || {}), ...data.attributes };
        }
        await this.skuMasterRepo.save(existing);
        updated++;
      } else {
        const newSku = this.skuMasterRepo.create({
          companyId: data.companyId,
          sku: data.sku,
          title: data.title || data.sku,
          storeId: data.storeId || '',
          siteId: data.siteId || null,
          imageUrl: data.imageUrl,
          purchasePrice: data.purchasePrice,
          cost: data.cost,
          shippingCost: data.shippingCost,
          weight: data.weight,
          boxSize: data.boxSize,
          packPerBox: data.packPerBox,
          exchangeRate: data.exchangeRate,
          promoter: data.promoter,
          attributes: data.attributes || {},
        });
        await this.skuMasterRepo.save(newSku);
        created++;
      }
    }

    return { created, updated, skipped };
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async deleteUpload(id: string, companyId: string) {
    const upload = await this.uploadRepo.findOne({ where: { id, companyId } });
    if (!upload) throw new BadRequestException('上传记录不存在');
    await this.uploadRepo.remove(upload);
    return { message: '删除成功' };
  }
}
