import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('sites')
export class SiteEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'marketplace_code' })
  marketplaceCode: string;

  @Column()
  region: string;

  @Column()
  currency: string;

  @Column({ name: 'timezone', default: 'UTC' })
  timezone: string;
}
