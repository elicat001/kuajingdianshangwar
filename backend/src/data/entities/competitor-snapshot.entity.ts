import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { CompetitorEntity } from './competitor.entity';

@Entity('competitor_snapshots')
export class CompetitorSnapshotEntity extends BaseEntity {
  @Column({ name: 'competitor_id' })
  competitorId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  rating: number;

  @Column({ name: 'review_count', nullable: true })
  reviewCount: number;

  @Column({ nullable: true })
  rank: number;

  @Column({ name: 'is_in_stock', default: true })
  isInStock: boolean;

  @Column({ name: 'snapshot_at', type: 'timestamptz' })
  snapshotAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  extra: Record<string, any>;

  @ManyToOne(() => CompetitorEntity)
  @JoinColumn({ name: 'competitor_id' })
  competitor: CompetitorEntity;
}
