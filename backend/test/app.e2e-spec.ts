import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / is public and reports the database is reachable', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api is not the health route (only / is unprefixed)', async () => {
    await request(app.getHttpServer()).get('/api').expect(404);
  });
});
