import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RecommendationStatus, RiskLevel } from '../../common/enums';

export class QueryRecommendationDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skuId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alertId?: string;

  @ApiPropertyOptional({ enum: RecommendationStatus })
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;
}
