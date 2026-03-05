import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AckAlertDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
