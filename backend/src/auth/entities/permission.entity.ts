import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';

@Entity('permissions')
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  resource: string;

  @Column()
  action: string;

  @Column({ name: 'page_code', nullable: true })
  pageCode: string;

  @Column({ name: 'role_id' })
  roleId: string;

  @ManyToOne(() => RoleEntity, (r) => r.permissions)
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;
}
