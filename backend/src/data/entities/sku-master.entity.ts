import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { SkuStatus } from '../../common/enums';
import { StoreEntity } from './store.entity';
import { SiteEntity } from './site.entity';

@Entity('sku_master')
export class SkuMasterEntity extends BaseEntity {
  @Column()
  sku: string;

  @Column({ nullable: true })
  asin: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost: number;

  @Column({ type: 'enum', enum: SkuStatus, default: SkuStatus.ACTIVE })
  status: SkuStatus;

  @Column({ name: 'store_id' })
  storeId: string;

  @Column({ name: 'site_id', nullable: true })
  siteId: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, any>;

  @ManyToOne(() => StoreEntity)
  @JoinColumn({ name: 'store_id' })
  store: StoreEntity;

  @ManyToOne(() => SiteEntity)
  @JoinColumn({ name: 'site_id' })
  site: SiteEntity;
}
