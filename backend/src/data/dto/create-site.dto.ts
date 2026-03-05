import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateSiteDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  marketplaceCode: string;

  @ApiProperty({ example: 'North America' })
  @IsString()
  region: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ example: 'America/Los_Angeles' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
