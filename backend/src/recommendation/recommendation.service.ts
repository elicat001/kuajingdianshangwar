import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationEntity } from './entities/recommendation.entity';
import { QueryRecommendationDto } from './dto/query-recommendation.dto';
import { RecommendationStatus } from '../common/enums';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(RecommendationEntity)
    private readonly recRepo: Repository<RecommendationEntity>,
  ) {}

  async queryRecommendations(
    companyId: string,
    query: QueryRecommendationDto,
  ): Promise<PaginatedResult<RecommendationEntity>> {
    const qb = this.recRepo
      .createQueryBuilder('r')
      .where('r.companyId = :companyId', { companyId });

    if (query.skuId) qb.andWhere('r.skuId = :skuId', { skuId: query.skuId });
    if (query.alertId) qb.andWhere('r.alertId = :alertId', { alertId: query.alertId });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.riskLevel) qb.andWhere('r.riskLevel = :riskLevel', { riskLevel: query.riskLevel });

    qb.orderBy('r.createdAt', 'DESC');

    const [items, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return new PaginatedResult(items, total, query.page, query.limit);
  }

  async getById(companyId: string, id: string) {
    const rec = await this.recRepo.findOne({
      where: { id, companyId },
      relations: ['alert'],
    });
    if (!rec) throw new NotFoundException('Recommendation not found');
    return rec;
  }

  async accept(companyId: string, id: string) {
    const rec = await this.getById(companyId, id);
    if (rec.status !== RecommendationStatus.PENDING) {
      throw new ConflictException(`Cannot accept: current status is ${rec.status}`);
    }
    rec.status = RecommendationStatus.ACCEPTED;
    return this.recRepo.save(rec);
  }

  async reject(companyId: string, id: string) {
    const rec = await this.getById(companyId, id);
    if (rec.status !== RecommendationStatus.PENDING) {
      throw new ConflictException(`Cannot reject: current status is ${rec.status}`);
    }
    rec.status = RecommendationStatus.REJECTED;
    return this.recRepo.save(rec);
  }

  async getBySkuId(companyId: string, skuId: string) {
    return this.recRepo.find({
      where: { companyId, skuId },
      order: { createdAt: 'DESC' },
      relations: ['alert'],
    });
  }
}
