import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { MetricDefVersionEntity } from './metric-def-version.entity';

@Entity('metric_defs')
export class MetricDefEntity extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ nullable: true })
  formula: string;

  @Column({ name: 'data_source', nullable: true })
  dataSource: string;

  @OneToMany(() => MetricDefVersionEntity, (v) => v.metricDef)
  versions: MetricDefVersionEntity[];
}
