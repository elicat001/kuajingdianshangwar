import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRbacPagePermissions1710000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add department and permission_overrides to users table
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(128) DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_overrides JSONB;
    `);

    // Add page_code to permissions table
    await queryRunner.query(`
      ALTER TABLE permissions ADD COLUMN IF NOT EXISTS page_code VARCHAR(64);
    `);

    // Seed default page permissions for existing roles
    await queryRunner.query(`
      INSERT INTO permissions (id, company_id, resource, action, page_code, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        r.company_id,
        'page',
        'access',
        pc.code,
        NOW(),
        NOW()
      FROM roles r
      CROSS JOIN (
        VALUES
          ('DASHBOARD'), ('SKU_MANAGEMENT'), ('IMPORT'), ('LINK_ANALYSIS'),
          ('AGENT'), ('ACTIONS'), ('ALERTS'), ('SETTINGS'),
          ('COMPETITORS'), ('REPORTS'), ('USER_MANAGEMENT')
      ) AS pc(code)
      WHERE r.name IN ('SUPER_ADMIN', 'ADMIN')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM permissions WHERE resource = 'page' AND action = 'access';
      ALTER TABLE permissions DROP COLUMN IF EXISTS page_code;
      ALTER TABLE users DROP COLUMN IF EXISTS permission_overrides;
      ALTER TABLE users DROP COLUMN IF EXISTS department;
    `);
  }
}
