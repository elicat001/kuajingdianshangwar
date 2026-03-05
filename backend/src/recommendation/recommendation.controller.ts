import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RecommendationService } from './recommendation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyGuard } from '../common/guards/company.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryRecommendationDto } from './dto/query-recommendation.dto';

@ApiTags('Recommendation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recService: RecommendationService) {}

  @Get()
  @ApiOperation({ summary: 'Query recommendations with pagination' })
  query(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryRecommendationDto,
  ) {
    return this.recService.queryRecommendations(companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recommendation by ID' })
  getById(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.recService.getById(companyId, id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a recommendation' })
  accept(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.recService.accept(companyId, id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a recommendation' })
  reject(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.recService.reject(companyId, id);
  }

  @Get('sku/:skuId')
  @ApiOperation({ summary: 'Get recommendations by SKU ID' })
  getBySku(
    @CurrentUser('companyId') companyId: string,
    @Param('skuId') skuId: string,
  ) {
    return this.recService.getBySkuId(companyId, skuId);
  }
}
