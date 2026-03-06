import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSiteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  marketplaceCode: string;

  @ApiProperty({ example: 'North America' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  region: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO code' })
  currency: string;

  @ApiPropertyOptional({ example: 'America/Los_Angeles' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}
