import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ActionType } from '../../common/enums';

export class CreateActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
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
  @Min(0)
  @Max(100)
  riskScore?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  skuId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;
}
