import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth-user.type';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { IdempotencyKey } from './idempotency-key.decorator';
import { OrderListItem, OrderPage, OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: ListOrdersQueryDto): Promise<OrderPage> {
    return this.orders.list(query);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: CreateOrderDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OrderListItem> {
    const { order, created } = await this.orders.create(
      user,
      idempotencyKey,
      dto,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    if (!created) {
      res.setHeader('Idempotent-Replayed', 'true');
    }
    return order;
  }
}
