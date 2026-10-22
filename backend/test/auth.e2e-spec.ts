import {
  Controller,
  Get,
  INestApplication,
  Module,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { Roles } from '../src/auth/roles.decorator';
import { RolesGuard } from '../src/auth/roles.guard';
import { PasswordService } from '../src/users/password.service';
import { Role } from '../src/users/role.enum';
import { UsersService } from '../src/users/users.service';
import { assertTestDatabase } from './helpers/test-context';

@Controller('test')
class ProbeController {
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  adminOnly() {
    return { ok: true };
  }
}

@Module({ imports: [AuthModule], controllers: [ProbeController] })
class ProbeModule {}

const ADMIN = { email: 'admin@test.local', password: 'Admin123!' };
const AGENT = { email: 'agent@test.local', password: 'Agent123!' };
const INACTIVE = { email: 'inactive@test.local', password: 'Inactive123!' };
const LOGOUT_USER = { email: 'logout@test.local', password: 'Logout123!' };

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let jwt: JwtService;
  let adminId: string;
  let agentId: string;

  const server = () => app.getHttpServer();
  const login = (body: object) =>
    request(server()).post('/api/login').send(body);
  const cookieFrom = (res: request.Response): string => {
    const cookie = res
      .get('Set-Cookie')
      ?.find((c) => c.startsWith('access_token='));
    return cookie ? cookie.split(';')[0] : '';
  };
  const base64url = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, ProbeModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    assertTestDatabase(connection);
    jwt = app.get(JwtService);
    const users = app.get(UsersService);
    const passwords = app.get(PasswordService);

    await connection.collection('users').deleteMany({});
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
    const inactive = await users.create({
      email: INACTIVE.email,
      passwordHash: await passwords.hash(INACTIVE.password),
      role: Role.Agent,
    });
    await connection
      .collection('users')
      .updateOne({ _id: inactive._id }, { $set: { active: false } });
    await users.create({
      email: LOGOUT_USER.email,
      passwordHash: await passwords.hash(LOGOUT_USER.password),
      role: Role.Agent,
    });
    adminId = String(admin.id);
    agentId = String(agent.id);
  });

  afterEach(async () => {
    await connection
      .collection('users')
      .updateOne(
        { email: AGENT.email },
        { $set: { active: true, role: Role.Agent } },
      );
  });

  afterAll(async () => {
    await connection.collection('users').deleteMany({});
    await app.close();
  });

  describe('POST /api/login', () => {
    it('logs in, returns the public user and sets a hardened cookie', async () => {
      const res = await login(ADMIN).expect(200);

      expect(res.body).toEqual({
        id: adminId,
        email: ADMIN.email,
        role: Role.Admin,
      });
      const setCookie = res.get('Set-Cookie')?.join(';') ?? '';
      expect(setCookie).toContain('access_token=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Strict');
      expect(setCookie).toContain('Path=/');
    });

    it('does not put the token in the response body', async () => {
      const res = await login(ADMIN).expect(200);

      expect(JSON.stringify(res.body)).not.toMatch(/ey[A-Za-z0-9_-]{10,}\./);
    });

    it('gives the same 401 for a wrong password and an unknown email', async () => {
      const wrongPassword = await login({ ...ADMIN, password: 'nope' }).expect(
        401,
      );
      const unknownEmail = await login({
        email: 'ghost@test.local',
        password: 'nope',
      }).expect(401);

      expect(unknownEmail.body).toEqual(wrongPassword.body);
    });

    it('rejects an inactive user', async () => {
      await login(INACTIVE).expect(401);
    });

    it('rejects a Mongo operator in the email (no operator injection)', async () => {
      await login({ email: { $ne: null }, password: 'x' }).expect(400);
    });

    it('rejects a Mongo operator in the password', async () => {
      await login({ email: ADMIN.email, password: { $ne: null } }).expect(400);
    });

    it('rejects unknown fields such as a role', async () => {
      await login({ ...AGENT, role: 'admin' }).expect(400);
    });
  });

  describe('authentication (JwtAuthGuard)', () => {
    it('GET /api/me works with the cookie from login', async () => {
      const cookie = cookieFrom(await login(AGENT).expect(200));

      const res = await request(server())
        .get('/api/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body).toEqual({
        id: agentId,
        email: AGENT.email,
        role: Role.Agent,
      });
    });

    it('rejects a request without a cookie', async () => {
      await request(server()).get('/api/me').expect(401);
    });

    it('ignores a valid token passed in the query string', async () => {
      const token = cookieFrom(await login(ADMIN).expect(200)).split('=')[1];

      await request(server()).get(`/api/me?token=${token}`).expect(401);
    });

    it('ignores a valid token passed in the Authorization header', async () => {
      const token = cookieFrom(await login(ADMIN).expect(200)).split('=')[1];

      await request(server())
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('rejects a token signed with a different secret', async () => {
      const forged = await jwt.signAsync(
        { sub: adminId },
        { secret: 'some-other-secret-some-other-secret-00' },
      );

      await request(server())
        .get('/api/me')
        .set('Cookie', `access_token=${forged}`)
        .expect(401);
    });

    it('rejects an unsigned token (alg: none)', async () => {
      const unsigned = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: adminId })}.`;

      await request(server())
        .get('/api/me')
        .set('Cookie', `access_token=${unsigned}`)
        .expect(401);
    });

    it('rejects an expired token', async () => {
      const expired = await jwt.signAsync(
        { sub: adminId, ver: 0 },
        { expiresIn: -10 },
      );

      await request(server())
        .get('/api/me')
        .set('Cookie', `access_token=${expired}`)
        .expect(401);
    });

    it('rejects a correctly signed token that has no version', async () => {
      const unversioned = await jwt.signAsync({ sub: adminId });

      await request(server())
        .get('/api/me')
        .set('Cookie', `access_token=${unversioned}`)
        .expect(401);
    });

    it('rejects a token whose user was deactivated', async () => {
      const cookie = cookieFrom(await login(AGENT).expect(200));
      await connection
        .collection('users')
        .updateOne({ email: AGENT.email }, { $set: { active: false } });

      await request(server()).get('/api/me').set('Cookie', cookie).expect(401);
    });
  });

  describe('authorization (RolesGuard)', () => {
    it('lets an admin reach an admin-only route', async () => {
      const cookie = cookieFrom(await login(ADMIN).expect(200));

      await request(server())
        .get('/api/test/admin-only')
        .set('Cookie', cookie)
        .expect(200);
    });

    it('forbids an agent on an admin-only route', async () => {
      const cookie = cookieFrom(await login(AGENT).expect(200));

      await request(server())
        .get('/api/test/admin-only')
        .set('Cookie', cookie)
        .expect(403);
    });

    it('requires authentication before the role check', async () => {
      await request(server()).get('/api/test/admin-only').expect(401);
    });

    it('ignores a role claim inside the token: the database decides', async () => {
      const claimsAdmin = await jwt.signAsync({
        sub: agentId,
        ver: 0,
        role: 'admin',
      });

      await request(server())
        .get('/api/test/admin-only')
        .set('Cookie', `access_token=${claimsAdmin}`)
        .expect(403);
    });

    it('applies a role change on the next request without a new login', async () => {
      const cookie = cookieFrom(await login(AGENT).expect(200));
      await request(server())
        .get('/api/test/admin-only')
        .set('Cookie', cookie)
        .expect(403);

      await connection
        .collection('users')
        .updateOne({ email: AGENT.email }, { $set: { role: Role.Admin } });
      await request(server())
        .get('/api/test/admin-only')
        .set('Cookie', cookie)
        .expect(200);
    });
  });

  describe('POST /api/logout', () => {
    it('clears the cookie', async () => {
      const cookie = cookieFrom(await login(LOGOUT_USER).expect(200));

      const res = await request(server())
        .post('/api/logout')
        .set('Cookie', cookie)
        .expect(204);

      const cleared = res.get('Set-Cookie')?.join(';') ?? '';
      expect(cleared).toContain('access_token=;');
      expect(cleared).toContain('Expires=Thu, 01 Jan 1970');
    });

    it('revokes the token server-side: a copied cookie stops working', async () => {
      const cookie = cookieFrom(await login(LOGOUT_USER).expect(200));
      await request(server()).get('/api/me').set('Cookie', cookie).expect(200);

      await request(server())
        .post('/api/logout')
        .set('Cookie', cookie)
        .expect(204);

      await request(server()).get('/api/me').set('Cookie', cookie).expect(401);
    });

    it('lets the user log in again after logging out', async () => {
      const cookie = cookieFrom(await login(LOGOUT_USER).expect(200));
      await request(server())
        .post('/api/logout')
        .set('Cookie', cookie)
        .expect(204);

      const fresh = cookieFrom(await login(LOGOUT_USER).expect(200));

      await request(server()).get('/api/me').set('Cookie', fresh).expect(200);
    });

    it('requires a valid session', async () => {
      await request(server()).post('/api/logout').expect(401);
    });
  });
});
