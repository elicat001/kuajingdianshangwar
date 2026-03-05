import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertEntity } from './entities/alert.entity';
import { QueryAlertDto } from './dto/query-alert.dto';
import { AlertStatus } from '../common/enums';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
  ) {}

  /**
   * Idempotent alert creation using dedupeKey.
   * If an alert with the same dedupeKey exists, return it without creating a new one.
   */
  async createAlert(
    companyId: string,
    data: Partial<AlertEntity>,
  ): Promise<AlertEntity> {
    if (data.dedupeKey) {
      const existing = await this.alertRepo.findOne({
        where: { dedupeKey: data.dedupeKey },
      });
      if (existing) return existing;
    }

    const alert = this.alertRepo.create({ ...data, companyId });
    try {
      return await this.alertRepo.save(alert);
    } catch (err: any) {
      // Handle unique constraint violation on dedupeKey
      if (err.code === '23505') {
        const existing = await this.alertRepo.findOne({
          where: { dedupeKey: data.dedupeKey },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async queryAlerts(
    companyId: string,
    query: QueryAlertDto,
  ): Promise<PaginatedResult<AlertEntity>> {
    const qb = this.alertRepo
      .createQueryBuilder('a')
      .where('a.companyId = :companyId', { companyId });

    if (query.type) qb.andWhere('a.type = :type', { type: query.type });
    if (query.severity) qb.andWhere('a.severity = :severity', { severity: query.severity });
    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.skuId) qb.andWhere('a.skuId = :skuId', { skuId: query.skuId });
    if (query.storeId) qb.andWhere('a.storeId = :storeId', { storeId: query.storeId });

    qb.orderBy('a.createdAt', 'DESC');

    const [items, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return new PaginatedResult(items, total, query.page, query.limit);
  }

  async acknowledgeAlert(companyId: string, id: string) {
    const alert = await this.findByIdOrThrow(companyId, id);
    if (alert.status !== AlertStatus.OPEN) {
      throw new ConflictException(`Alert is not in OPEN status, current: ${alert.status}`);
    }
    alert.status = AlertStatus.ACKNOWLEDGED;
    return this.alertRepo.save(alert);
  }

  async closeAlert(companyId: string, id: string) {
    const alert = await this.findByIdOrThrow(companyId, id);
    if (alert.status === AlertStatus.CLOSED) {
      throw new ConflictException('Alert is already closed');
    }
    alert.status = AlertStatus.CLOSED;
    return this.alertRepo.save(alert);
  }

  async getAlertById(companyId: string, id: string) {
    return this.findByIdOrThrow(companyId, id);
  }

  private async findByIdOrThrow(companyId: string, id: string) {
    const alert = await this.alertRepo.findOne({
      where: { id, companyId },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }
}
