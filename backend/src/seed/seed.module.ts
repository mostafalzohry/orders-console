import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { envValidationSchema } from '../config/env.validation';
import { mongooseOptions } from '../config/mongoose.config';
import { Order, OrderSchema } from '../orders/order.schema';
import { OrdersRepository } from '../orders/orders.repository';
import { UsersModule } from '../users/users.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: mongooseOptions,
    }),
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    UsersModule,
  ],
  providers: [SeedService, OrdersRepository],
})
export class SeedModule {}
