import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActionService } from './action.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateActionDto } from './dto/create-action.dto';
import { QueryActionDto } from './dto/query-action.dto';
import { ApproveActionDto } from './dto/approve-action.dto';
import { UserRole } from '../common/enums';

@ApiTags('Action')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('actions')
export class ActionController {
  constructor(private readonly actionService: ActionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new action (DRAFT)' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateActionDto,
  ) {
    return this.actionService.createAction(companyId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Query actions with pagination' })
  query(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryActionDto,
  ) {
    return this.actionService.queryActions(companyId, query);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  getAuditLogs(
    @CurrentUser('companyId') companyId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.actionService.getAuditLogs(companyId, entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get action by ID with approvals, executions, rollbacks' })
  getById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.actionService.getActionById(companyId, id);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit action for approval' })
  submit(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.actionService.submitAction(companyId, userId, id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve or reject an action' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  approve(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ApproveActionDto,
  ) {
    return this.actionService.approveAction(companyId, userId, id, dto);
  }

  @Patch(':id/execute')
  @ApiOperation({ summary: 'Execute an approved action' })
  execute(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { result?: Record<string, any>; error?: string },
  ) {
    return this.actionService.executeAction(
      companyId,
      userId,
      id,
      body.result,
      body.error,
    );
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify an executed action' })
  verify(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { verificationResult: Record<string, any> },
  ) {
    return this.actionService.verifyAction(
      companyId,
      userId,
      id,
      body.verificationResult,
    );
  }

  @Patch(':id/rollback')
  @ApiOperation({ summary: 'Rollback an executed action' })
  rollback(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { previousState: Record<string, any> },
  ) {
    return this.actionService.rollbackAction(
      companyId,
      userId,
      id,
      body.previousState,
    );
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close an action' })
  close(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.actionService.closeAction(companyId, userId, id);
  }
}
