import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ActionType } from '../../common/enums';

export class CreateActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendationId?: string;

  @ApiProperty({ enum: ActionType })
  @IsEnum(ActionType)
  type: ActionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  params?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  guardrails?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  riskScore?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

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
}
