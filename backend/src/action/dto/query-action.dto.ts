import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ActionType, ActionStatus } from '../../common/enums';

export class QueryActionDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ActionType })
  @IsOptional()
  @IsEnum(ActionType)
  type?: ActionType;

  @ApiPropertyOptional({ enum: ActionStatus })
  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

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
  createdBy?: string;
}
