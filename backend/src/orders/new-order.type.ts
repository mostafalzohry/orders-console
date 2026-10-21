import { Types } from 'mongoose';
import { OrderStatus } from './order-status.enum';
import { OrderItem } from './order.schema';

export interface NewOrder {
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  items: OrderItem[];
  totalMinor: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface OrderToCreate {
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  items: OrderItem[];
  totalMinor: number;
  createdBy: string;
  idempotencyKey: string;
  payloadHash: string;
}
