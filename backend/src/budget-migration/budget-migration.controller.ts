import { Controller, Get, Post, Patch, Query, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BudgetMigrationService } from './budget-migration.service';
import { CreateMigrationDto } from './dto/create-migration.dto';
import { QueryMigrationDto } from './dto/query-migration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Budget Migrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('budget-migrations')
export class BudgetMigrationController {
  constructor(private readonly service: BudgetMigrationService) {}

  @Get('analyze')
  @ApiOperation({ summary: 'Analyze campaigns for budget migration opportunities' })
  analyze(@CurrentUser('companyId') companyId: string) {
    return this.service.analyzeCampaigns(companyId);
  }

  @Get()
  @ApiOperation({ summary: 'List budget migrations (paginated)' })
  query(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryMigrationDto,
  ) {
    return this.service.queryMigrations(companyId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a budget migration' })
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateMigrationDto,
  ) {
    return this.service.createMigration(companyId, dto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a budget migration' })
  approve(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.approveMigration(companyId, id);
  }

  @Patch(':id/execute')
  @ApiOperation({ summary: 'Execute an approved budget migration' })
  execute(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.executeMigration(companyId, id);
  }

  @Patch(':id/rollback')
  @ApiOperation({ summary: 'Roll back a budget migration' })
  rollback(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.rollbackMigration(companyId, id);
  }
}
