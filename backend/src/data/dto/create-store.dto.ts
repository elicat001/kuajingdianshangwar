import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateStoreDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'AMAZON' })
  @IsString()
  platform: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;
}
