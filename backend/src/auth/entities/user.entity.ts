import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { CompanyEntity } from './company.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @ManyToOne(() => CompanyEntity)
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @OneToMany(() => UserRoleEntity, (ur) => ur.user)
  userRoles: UserRoleEntity[];
}
