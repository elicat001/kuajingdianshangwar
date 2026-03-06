import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsObject, IsEnum, MaxLength, MinLength, IsUUID, Min } from 'class-validator';
import { SkuStatus } from '../../common/enums';
import { Transform } from 'class-transformer';

export class UpdateSkuDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  asin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ enum: SkuStatus })
  @IsOptional()
  @IsEnum(SkuStatus)
  status?: SkuStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}
