import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max, IsString, Matches, IsIn } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9]*$/, { message: 'sortBy must be a valid field name' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}

export class PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;

  constructor(data: T[], total: number, page: number | undefined, limit: number | undefined) {
    this.data = data;
    this.total = total;
    this.page = page ?? 1;
    this.pageSize = limit ?? 20;
    this.totalPages = Math.ceil(total / this.pageSize);
  }
}
