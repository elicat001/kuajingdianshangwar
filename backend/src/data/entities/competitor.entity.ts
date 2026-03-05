import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('competitors')
export class CompetitorEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  asin: string;

  @Column({ name: 'sku_id', nullable: true })
  skuId: string;

  @Column()
  platform: string;

  @Column({ name: 'product_url', nullable: true })
  productUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
