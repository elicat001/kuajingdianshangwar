import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('store_promoter_mappings')
@Unique('uq_store_promoter', ['companyId', 'storeName', 'userId'])
@Index('idx_spm_company_store', ['companyId', 'storeName'])
@Index('idx_spm_company_user', ['companyId', 'userId'])
export class StorePromoterMappingEntity extends BaseEntity {
  @Column({ name: 'store_name', length: 128 })
  storeName: string;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'promoter_name', length: 64, default: '' })
  promoterName: string;

  @Column({ name: 'is_primary', default: true })
  isPrimary: boolean;
}
