import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth-user.type';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RequestAbortSignal } from '../common/decorators/request-abort-signal.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { Role } from '../users/role.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { IdempotencyKey } from './idempotency-key.decorator';
import { OrderStats, OrdersStatsService } from './orders-stats.service';
import { OrderListItem, OrderPage, OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly stats: OrdersStatsService,
  ) {}

  @Get()
  list(@Query() query: ListOrdersQueryDto): Promise<OrderPage> {
    return this.orders.list(query);
  }

  @Get('stats')
  getStats(@RequestAbortSignal() signal: AbortSignal): Promise<OrderStats> {
    return this.stats.stats(signal);
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.orders.delete(id, user);
  }
}
