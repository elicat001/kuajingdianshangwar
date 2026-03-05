import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { MetricDefEntity } from './metric-def.entity';

@Entity('metric_def_versions')
export class MetricDefVersionEntity extends BaseEntity {
  @Column({ name: 'metric_def_id' })
  metricDefId: string;

  @Column()
  version: number;

  @Column({ type: 'text' })
  formula: string;

  @Column({ type: 'text', nullable: true })
  changelog: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo: Date;

  @ManyToOne(() => MetricDefEntity, (m) => m.versions)
  @JoinColumn({ name: 'metric_def_id' })
  metricDef: MetricDefEntity;
}
