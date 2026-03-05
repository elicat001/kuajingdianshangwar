import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { StoreStatus } from '../../common/enums';
import { StoreSiteBindingEntity } from './store-site-binding.entity';

@Entity('stores')
export class StoreEntity extends BaseEntity {
  @Column()
  name: string;

  @Column()
  platform: string;

  @Column({ name: 'seller_id', nullable: true })
  sellerId: string;

  @Column({ type: 'enum', enum: StoreStatus, default: StoreStatus.ACTIVE })
  status: StoreStatus;

  @Column({ type: 'jsonb', nullable: true })
  credentials: Record<string, any>;

  @OneToMany(() => StoreSiteBindingEntity, (b) => b.store)
  siteBindings: StoreSiteBindingEntity[];
}
