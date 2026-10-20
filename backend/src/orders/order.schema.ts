import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from './order-status.enum';

export const MAX_ITEMS_PER_ORDER = 5;

const isWholeNumber = {
  validator: Number.isInteger,
  message: '{PATH} must be a whole number',
};

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, min: 1, validate: isWholeNumber })
  quantity!: number;

  @Prop({ required: true, min: 1, validate: isWholeNumber })
  unitPriceMinor!: number;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Order {
  @Prop({ required: true, trim: true, lowercase: true })
  customerName!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  customerEmail!: string;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    required: true,
    default: OrderStatus.Pending,
  })
  status!: OrderStatus;

  @Prop({
    type: [OrderItemSchema],
    required: true,
    validate: {
      validator: (items: unknown[]) =>
        items.length >= 1 && items.length <= MAX_ITEMS_PER_ORDER,
      message: `an order needs 1 to ${MAX_ITEMS_PER_ORDER} items`,
    },
  })
  items!: OrderItem[];

  @Prop({ required: true, min: 0, validate: isWholeNumber })
  totalMinor!: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: String })
  idempotencyKey?: string;

  @Prop({ type: String })
  payloadHash?: string;

  createdAt!: Date;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ createdAt: -1, _id: -1 });
OrderSchema.index({ totalMinor: -1, _id: -1 });
OrderSchema.index({ status: 1, createdAt: -1, _id: -1 });
OrderSchema.index({ status: 1, totalMinor: -1, _id: -1 });
OrderSchema.index({ customerName: 1 });
OrderSchema.index({ customerEmail: 1 });
OrderSchema.index(
  { createdBy: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  },
);
