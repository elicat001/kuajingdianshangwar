import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateCompetitorDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skuId?: string;

  @ApiProperty()
  @IsString()
  platform: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
