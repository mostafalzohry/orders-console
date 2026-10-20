import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OrderStatus } from '../order-status.enum';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_DIRECTIONS,
  SORT_FIELDS,
} from '../constants/orders.constants';
import type { SortDirection, SortField } from '../constants/orders.constants';

export class ListOrdersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SEARCH_LENGTH)
  search?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsIn(SORT_FIELDS)
  sort: SortField = 'createdAt';

  @IsIn(SORT_DIRECTIONS)
  dir: SortDirection = 'desc';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  cursor?: string;
}
