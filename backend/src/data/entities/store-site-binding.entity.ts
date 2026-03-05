import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { StoreEntity } from './store.entity';
import { SiteEntity } from './site.entity';

@Entity('store_site_bindings')
@Unique(['storeId', 'siteId'])
export class StoreSiteBindingEntity extends BaseEntity {
  @Column({ name: 'store_id' })
  storeId: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => StoreEntity, (s) => s.siteBindings)
  @JoinColumn({ name: 'store_id' })
  store: StoreEntity;

  @ManyToOne(() => SiteEntity)
  @JoinColumn({ name: 'site_id' })
  site: SiteEntity;
}
