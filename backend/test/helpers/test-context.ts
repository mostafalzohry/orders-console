import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { Order } from '../../src/orders/order.schema';
import { PasswordService } from '../../src/users/password.service';
import { Role } from '../../src/users/role.enum';
import { UsersService } from '../../src/users/users.service';

export const ADMIN = { email: 'admin@test.local', password: 'Admin123!' };
export const AGENT = { email: 'agent@test.local', password: 'Agent123!' };

export interface TestContext {
  app: INestApplication<App>;
  connection: Connection;
  orders: Model<Order>;
  adminCookie: string;
  agentCookie: string;
  adminId: Types.ObjectId;
  agentId: Types.ObjectId;
  close: () => Promise<void>;
}

export async function createTestContext(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  const connection = app.get<Connection>(getConnectionToken());
  if (!/_test$/.test(connection.name)) {
    throw new Error(
      `Refusing to wipe "${connection.name}": not a test database`,
    );
  }
  const orders = app.get<Model<Order>>(getModelToken(Order.name));
  await orders.init();

  const users = app.get(UsersService);
  const passwords = app.get(PasswordService);
  await connection.collection('users').deleteMany({});
  await orders.deleteMany({});
  const admin = await users.create({
    email: ADMIN.email,
    passwordHash: await passwords.hash(ADMIN.password),
    role: Role.Admin,
  });
  const agent = await users.create({
    email: AGENT.email,
    passwordHash: await passwords.hash(AGENT.password),
    role: Role.Agent,
  });

  const cookieFor = async (credentials: object): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/login')
      .send(credentials);
    const cookie = res
      .get('Set-Cookie')
      ?.find((c) => c.startsWith('access_token='));
    return cookie ? cookie.split(';')[0] : '';
  };

  return {
    app,
    connection,
    orders,
    adminCookie: await cookieFor(ADMIN),
    agentCookie: await cookieFor(AGENT),
    adminId: admin._id,
    agentId: agent._id,
    close: async () => {
      await orders.deleteMany({});
      await connection.collection('users').deleteMany({});
      await app.close();
    },
  };
}
