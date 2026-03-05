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
import { AlertService } from './alert.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryAlertDto } from './dto/query-alert.dto';
import { AckAlertDto } from './dto/ack-alert.dto';

@ApiTags('Alert')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get()
  @ApiOperation({ summary: 'Query alerts with pagination and filters' })
  queryAlerts(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryAlertDto,
  ) {
    return this.alertService.queryAlerts(companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert by ID' })
  getAlert(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.alertService.getAlertById(companyId, id);
  }

  @Patch(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  acknowledgeAlert(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() _dto: AckAlertDto,
  ) {
    return this.alertService.acknowledgeAlert(companyId, id);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close an alert' })
  closeAlert(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.alertService.closeAlert(companyId, id);
  }
}
