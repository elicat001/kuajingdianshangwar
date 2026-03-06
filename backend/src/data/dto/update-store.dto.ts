import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum, MaxLength, MinLength } from 'class-validator';
import { StoreStatus } from '../../common/enums';
import { Transform } from 'class-transformer';

export class UpdateStoreDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({ example: 'AMAZON' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sellerId?: string;

  @ApiPropertyOptional({ enum: StoreStatus })
  @IsOptional()
  @IsEnum(StoreStatus)
  status?: StoreStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;
}
