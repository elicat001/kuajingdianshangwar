import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { MetricWindow } from '../../common/enums';

export class QueryMetricsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skuId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metricCode?: string;

  @ApiPropertyOptional({ enum: MetricWindow })
  @IsOptional()
  @IsEnum(MetricWindow)
  window?: MetricWindow;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
