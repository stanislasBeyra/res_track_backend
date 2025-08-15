import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Backend Trask (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('App Controller', () => {
    it('/ (GET)', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('Auth Controller', () => {
    it('/auth/register (POST) - should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400);
    });

    it('/auth/login (POST) - should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('Alerts Controller', () => {
    it('/alerts (GET) - should return alerts list', () => {
      return request(app.getHttpServer())
        .get('/alerts')
        .expect(200);
    });

    it('/alerts (POST) - should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/alerts')
        .send({})
        .expect(400);
    });
  });

  describe('Swagger Documentation', () => {
    it('/api (GET) - should serve Swagger UI', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200);
    });

    it('/api-json (GET) - should serve OpenAPI JSON', () => {
      return request(app.getHttpServer())
        .get('/api-json')
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });
});
