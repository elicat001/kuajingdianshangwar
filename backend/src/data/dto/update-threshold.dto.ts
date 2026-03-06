import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, MinLength, IsUUID } from 'class-validator';

export class UpdateThresholdDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  metricCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  skuId?: string;

  @ApiProperty()
  @IsNumber()
  warnValue: number;

  @ApiProperty()
  @IsNumber()
  criticalValue: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
