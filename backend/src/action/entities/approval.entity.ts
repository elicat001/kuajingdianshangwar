import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ActionEntity } from './action.entity';

@Entity('approvals')
export class ApprovalEntity extends BaseEntity {
  @Column({ name: 'action_id' })
  actionId: string;

  @Column({ name: 'approver_user_id' })
  approverUserId: string;

  @Column({ type: 'varchar', length: 20 })
  decision: 'approved' | 'rejected';

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'decided_at', type: 'timestamptz' })
  decidedAt: Date;

  @ManyToOne(() => ActionEntity, (a) => a.approvals)
  @JoinColumn({ name: 'action_id' })
  action: ActionEntity;
}
