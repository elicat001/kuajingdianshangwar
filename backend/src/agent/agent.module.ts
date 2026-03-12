import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { IntentParser } from './intent-parser';
import { LlmClient } from './llm-client';
import { SalesTool } from './tools/sales-tool';
import { PromotionTool } from './tools/promotion-tool';
import { InventoryTool } from './tools/inventory-tool';
import { LinkAnalysisTool } from './tools/link-analysis-tool';

// New report entities
import { SkuSalesReportEntity } from '../metrics/entities/sku-sales-report.entity';
import { InventoryReportEntity } from '../metrics/entities/inventory-report.entity';
import { PromotionFeeReportEntity } from '../metrics/entities/promotion-fee-report.entity';
import { ProductPerformanceReportEntity } from '../metrics/entities/product-performance-report.entity';

// Legacy fact entities (fallback)
import { SalesFactEntity } from '../metrics/entities/sales-fact.entity';
import { AdsFactEntity } from '../metrics/entities/ads-fact.entity';
import { InventoryFactEntity } from '../metrics/entities/inventory-fact.entity';

// Data entities
import { SkuMasterEntity } from '../data/entities/sku-master.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // New report entities
      SkuSalesReportEntity,
      InventoryReportEntity,
      PromotionFeeReportEntity,
      ProductPerformanceReportEntity,
      // Legacy fact entities
      SalesFactEntity,
      AdsFactEntity,
      InventoryFactEntity,
      // Data entities
      SkuMasterEntity,
    ]),
  ],
  controllers: [AgentController],
  providers: [
    AgentService,
    IntentParser,
    LlmClient,
    SalesTool,
    PromotionTool,
    InventoryTool,
    LinkAnalysisTool,
  ],
})
export class AgentModule {}
