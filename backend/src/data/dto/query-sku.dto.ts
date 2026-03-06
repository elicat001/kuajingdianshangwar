import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SkuStatus } from '../../common/enums';

export class QuerySkuDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ enum: SkuStatus })
  @IsOptional()
  @IsEnum(SkuStatus)
  status?: SkuStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;
}
