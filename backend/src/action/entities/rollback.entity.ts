import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ActionEntity } from './action.entity';

@Entity('rollbacks')
export class RollbackEntity extends BaseEntity {
  @Column({ name: 'action_id' })
  actionId: string;

  @Column({ name: 'rolled_back_by' })
  rolledBackBy: string;

  @Column({ name: 'previous_state', type: 'jsonb', nullable: true })
  previousState: Record<string, any>;

  @Column({ name: 'rolled_back_at', type: 'timestamptz' })
  rolledBackAt: Date;

  @ManyToOne(() => ActionEntity, (a) => a.rollbacks)
  @JoinColumn({ name: 'action_id' })
  action: ActionEntity;
}
