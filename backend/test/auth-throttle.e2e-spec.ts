process.env.LOGIN_RATE_LIMIT_PER_ACCOUNT = '3';
process.env.LOGIN_RATE_LIMIT_PER_IP = '5';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Login rate limits (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const attempt = (email: string) =>
    request(app.getHttpServer())
      .post('/api/login')
      .send({ email, password: 'wrong' });

  it('limits one account from one IP', async () => {
    await attempt('ghost@test.local').expect(401);
    await attempt('ghost@test.local').expect(401);
    await attempt('ghost@test.local').expect(401);
    await attempt('ghost@test.local').expect(429);
  });

  it('counts the same account regardless of letter case', async () => {
    await attempt('ghost@test.local').expect(401);
    await attempt('GHOST@test.local').expect(401);
    await attempt('Ghost@Test.local').expect(401);
    await attempt('ghost@test.local').expect(429);
  });

  it('does not block other accounts when one account is limited', async () => {
    await attempt('ghost@test.local').expect(401);
    await attempt('ghost@test.local').expect(401);
    await attempt('ghost@test.local').expect(401);
    await attempt('ghost@test.local').expect(429);

    await attempt('someone-else@test.local').expect(401);
  });

  it('limits one IP trying many different accounts', async () => {
    for (let i = 0; i < 5; i++) {
      await attempt(`user${i}@test.local`).expect(401);
    }

    await attempt('user5@test.local').expect(429);
  });
});
