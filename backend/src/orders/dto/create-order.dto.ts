import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MAX_EMAIL_LENGTH,
  MAX_ITEM_QUANTITY,
  MAX_ITEMS_PER_ORDER,
  MAX_TEXT_LENGTH,
  MAX_UNIT_PRICE_MINOR,
} from '../constants/orders.constants';

const HAS_VISIBLE_TEXT = /\S/;
const NOT_BLANK = { message: '$property must not be blank' };

export class CreateOrderItemDto {
  @IsString()
  @Matches(HAS_VISIBLE_TEXT, NOT_BLANK)
  @MaxLength(MAX_TEXT_LENGTH)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QUANTITY)
  quantity!: number;

  @IsInt()
  @Min(1)
  @Max(MAX_UNIT_PRICE_MINOR)
  unitPriceMinor!: number;
}

export class CreateOrderDto {
  @IsString()
  @Matches(HAS_VISIBLE_TEXT, NOT_BLANK)
  @MaxLength(MAX_TEXT_LENGTH)
  customerName!: string;

  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  customerEmail!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ITEMS_PER_ORDER)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
