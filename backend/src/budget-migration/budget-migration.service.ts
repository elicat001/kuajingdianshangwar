import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BudgetMigrationEntity } from './entities/budget-migration.entity';
import { AdsFactEntity } from '../metrics/entities/ads-fact.entity';
import { CreateMigrationDto } from './dto/create-migration.dto';
import { QueryMigrationDto } from './dto/query-migration.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';

/**
 * A "campaign" is modeled as a unique (skuId, storeId) pair since AdsFactEntity
 * has no dedicated campaignId column. The campaignId used throughout this module
 * is the composite key formatted as "skuId::storeId".
 *
 * dailyBudget is estimated as the average daily adSpend over the analysis window.
 */

export interface CampaignROAS {
  campaignId: string; // "skuId::storeId"
  skuId: string;
  storeId: string;
  totalSpend: number;
  totalRevenue: number;
  roas: number;
  dailyBudget: number;
}

@Injectable()
export class BudgetMigrationService {
  constructor(
    @InjectRepository(BudgetMigrationEntity)
    private readonly migrationRepo: Repository<BudgetMigrationEntity>,
    @InjectRepository(AdsFactEntity)
    private readonly adsRepo: Repository<AdsFactEntity>,
  ) {}

  /**
   * Analyze campaigns and identify budget migration opportunities.
   * Donors: ROAS < 1.5 (low efficiency)
   * Receivers: ROAS > 3.0 (high efficiency)
   */
  async analyzeCampaigns(companyId: string): Promise<{
    donors: CampaignROAS[];
    receivers: CampaignROAS[];
    suggestions: Array<{ from: CampaignROAS; to: CampaignROAS; amount: number; expectedRoasGain: number }>;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const campaignStats = await this.adsRepo
      .createQueryBuilder('a')
      .select('a.skuId', 'skuId')
      .addSelect('a.storeId', 'storeId')
      .addSelect('COALESCE(SUM(a.adSpend), 0)', 'totalSpend')
      .addSelect('COALESCE(SUM(a.adRevenue), 0)', 'totalRevenue')
      .addSelect('COALESCE(AVG(a.adSpend), 0)', 'dailyBudget')
      .where('a.companyId = :companyId AND a.reportDate >= :startDate', { companyId, startDate: startStr })
      .groupBy('a.skuId')
      .addGroupBy('a.storeId')
      .having('SUM(a.adSpend) > 0')
      .getRawMany();

    const campaigns: CampaignROAS[] = campaignStats.map((r: Record<string, unknown>) => ({
      campaignId: `${r.skuId}::${r.storeId}`,
      skuId: String(r.skuId || ''),
      storeId: String(r.storeId || ''),
      totalSpend: Number(r.totalSpend) || 0,
      totalRevenue: Number(r.totalRevenue) || 0,
      roas: Number(r.totalSpend) > 0 ? Number(r.totalRevenue) / Number(r.totalSpend) : 0,
      dailyBudget: Number(r.dailyBudget) || 0,
    }));

    const donors = campaigns.filter(c => c.roas < 1.5 && c.totalSpend > 50);
    const receivers = campaigns.filter(c => c.roas > 3.0);

    // Sort donors by ROAS ascending (worst first), receivers by ROAS descending (best first)
    donors.sort((a, b) => a.roas - b.roas);
    receivers.sort((a, b) => b.roas - a.roas);

    // Generate suggestions: pair donors with receivers
    const suggestions: Array<{ from: CampaignROAS; to: CampaignROAS; amount: number; expectedRoasGain: number }> = [];

    for (const donor of donors) {
      for (const receiver of receivers) {
        // Migrate up to 30% of donor's daily budget
        const amount = Math.round(donor.dailyBudget * 0.3 * 100) / 100;
        if (amount < 1) continue;

        const expectedRoasGain = Math.round((receiver.roas - donor.roas) * 100) / 100;
        suggestions.push({ from: donor, to: receiver, amount, expectedRoasGain });
        break; // One suggestion per donor
      }
    }

    return { donors, receivers, suggestions };
  }

  async createMigration(companyId: string, dto: CreateMigrationDto) {
    // Get ROAS data for both campaigns (campaignId = "skuId::storeId")
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const getRoas = async (campaignId: string) => {
      const [skuId, storeId] = campaignId.split('::');
      const result = await this.adsRepo
        .createQueryBuilder('a')
        .select('COALESCE(SUM(a.adSpend), 0)', 'spend')
        .addSelect('COALESCE(SUM(a.adRevenue), 0)', 'revenue')
        .addSelect('COALESCE(AVG(a.adSpend), 0)', 'dailyBudget')
        .where(
          'a.companyId = :companyId AND a.skuId = :skuId AND a.storeId = :storeId AND a.reportDate >= :startDate',
          { companyId, skuId, storeId, startDate: startStr },
        )
        .getRawOne();
      const spend = Number(result?.spend) || 0;
      const revenue = Number(result?.revenue) || 0;
      return { roas: spend > 0 ? revenue / spend : 0, dailyBudget: Number(result?.dailyBudget) || 0, skuId };
    };

    const sourceData = await getRoas(dto.sourceCampaignId);
    const targetData = await getRoas(dto.targetCampaignId);

    const entity = new BudgetMigrationEntity();
    entity.companyId = companyId;
    entity.sourceCampaignId = dto.sourceCampaignId;
    entity.targetCampaignId = dto.targetCampaignId;
    if (dto.sourceSkuId) entity.sourceSkuId = dto.sourceSkuId;
    else entity.sourceSkuId = sourceData.skuId;
    if (dto.targetSkuId) entity.targetSkuId = dto.targetSkuId;
    else entity.targetSkuId = targetData.skuId;
    entity.migratedAmount = dto.migratedAmount;
    entity.sourceRoas = Math.round(sourceData.roas * 100) / 100;
    entity.targetRoas = Math.round(targetData.roas * 100) / 100;
    entity.sourceDailyBudget = sourceData.dailyBudget;
    entity.targetDailyBudget = targetData.dailyBudget;
    entity.status = 'PENDING';
    entity.expectedImpact = {
      roasGain: Math.round((targetData.roas - sourceData.roas) * 100) / 100,
      estimatedAdditionalRevenue: Math.round(dto.migratedAmount * targetData.roas * 100) / 100,
    };

    return this.migrationRepo.save(entity);
  }

  async queryMigrations(companyId: string, query: QueryMigrationDto): Promise<PaginatedResult<BudgetMigrationEntity>> {
    const qb = this.migrationRepo
      .createQueryBuilder('m')
      .where('m.companyId = :companyId', { companyId });

    if (query.status) qb.andWhere('m.status = :status', { status: query.status });
    if (query.skuId) {
      qb.andWhere('(m.sourceSkuId = :skuId OR m.targetSkuId = :skuId)', { skuId: query.skuId });
    }

    qb.orderBy('m.createdAt', 'DESC');

    const [items, total] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
    return new PaginatedResult(items, total, query.page, query.limit);
  }

  async approveMigration(companyId: string, id: string) {
    const migration = await this.migrationRepo.findOne({ where: { id, companyId } });
    if (!migration) throw new NotFoundException('Budget migration not found');
    migration.status = 'APPROVED';
    return this.migrationRepo.save(migration);
  }

  async executeMigration(companyId: string, id: string) {
    const migration = await this.migrationRepo.findOne({ where: { id, companyId } });
    if (!migration) throw new NotFoundException('Budget migration not found');
    if (migration.status !== 'APPROVED') throw new NotFoundException('Migration must be approved first');
    migration.status = 'EXECUTED';
    return this.migrationRepo.save(migration);
  }

  async rollbackMigration(companyId: string, id: string) {
    const migration = await this.migrationRepo.findOne({ where: { id, companyId } });
    if (!migration) throw new NotFoundException('Budget migration not found');
    migration.status = 'ROLLED_BACK';
    return this.migrationRepo.save(migration);
  }
}
