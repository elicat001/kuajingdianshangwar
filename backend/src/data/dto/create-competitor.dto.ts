import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, MaxLength, MinLength, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCompetitorDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  asin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  skuId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  platform: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  productUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
