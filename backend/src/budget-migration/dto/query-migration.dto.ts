import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryMigrationDto extends PaginationDto {
  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @IsString()
  skuId?: string;
}
