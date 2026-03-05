import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ActionEntity } from './action.entity';

@Entity('executions')
export class ExecutionEntity extends BaseEntity {
  @Column({ name: 'action_id' })
  actionId: string;

  @Column({ name: 'executed_by' })
  executedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ name: 'executed_at', type: 'timestamptz' })
  executedAt: Date;

  @ManyToOne(() => ActionEntity, (a) => a.executions)
  @JoinColumn({ name: 'action_id' })
  action: ActionEntity;
}
