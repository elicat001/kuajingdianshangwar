import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../../common/enums';
import { PermissionEntity } from './permission.entity';

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserRole, unique: true })
  name: UserRole;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => PermissionEntity, (p) => p.role)
  permissions: PermissionEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
