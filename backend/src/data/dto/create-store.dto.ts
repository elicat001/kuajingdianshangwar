import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateStoreDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'AMAZON' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  platform: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sellerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;
}
