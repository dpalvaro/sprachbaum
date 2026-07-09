import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DEV_USER_EMAIL } from './../src/dev-user';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Contra la Postgres real de docker-compose, usando la lección 1 ya
 * sembrada por `content:seed` (issue #17). Requiere `pnpm content:seed`
 * corrido al menos una vez. Ejercicio real usado:
 * l01-sein-ex01 — "¿Qué forma de sein va con ich?" options: [bin, bist, ist,
 * sind], correctIndices: [0].
 */
describe('Exercises (e2e, multiple_choice)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let exerciseId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const exercise = await prisma.exercise.findUniqueOrThrow({
      where: { slug: 'l01-sein-ex01' },
      select: { id: true },
    });
    exerciseId = exercise.id;

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: DEV_USER_EMAIL },
      select: { id: true },
    });
    userId = user.id;

    // Deja el contador de intentos limpio para que el test sea repetible.
    await prisma.attempt.deleteMany({ where: { userId, exerciseId } });
    await prisma.learningEvent.deleteMany({
      where: { userId, entityId: exerciseId },
    });
  });

  afterAll(async () => {
    await prisma.attempt.deleteMany({ where: { userId, exerciseId } });
    await prisma.learningEvent.deleteMany({
      where: { userId, entityId: exerciseId },
    });
    await app.close();
  });

  it('GET /lessons/:slug/exercises lists the real lesson 1 exercises without payload', async () => {
    const res = await request(app.getHttpServer())
      .get('/lessons/a1-l01-hallo/exercises')
      .expect(200);

    const body = res.body as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: exerciseId, type: 'multiple_choice' }),
      ]),
    );
    expect(body[0]).not.toHaveProperty('payload');
  });

  it('GET /exercises/:id returns the public payload and never the solution', async () => {
    const res = await request(app.getHttpServer())
      .get(`/exercises/${exerciseId}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: exerciseId,
      type: 'multiple_choice',
      payload: { options: ['bin', 'bist', 'ist', 'sind'] },
    });
    expect(JSON.stringify(res.body)).not.toContain('correctIndices');
    expect(res.body).not.toHaveProperty('solution');
  });

  it('1st wrong attempt: no reveal', async () => {
    const res = await request(app.getHttpServer())
      .post(`/exercises/${exerciseId}/attempts`)
      .send({ answer: { selectedIndices: [1] }, latencyMs: 1200 })
      .expect(201);

    expect(res.body).toEqual({ correct: false, attemptNumber: 1 });
  });

  it('2nd wrong attempt: reveals the correct indices', async () => {
    const res = await request(app.getHttpServer())
      .post(`/exercises/${exerciseId}/attempts`)
      .send({ answer: { selectedIndices: [2] }, latencyMs: 900 })
      .expect(201);

    expect(res.body).toEqual({
      correct: false,
      attemptNumber: 2,
      revealedSolution: [0],
    });

    const events = await prisma.learningEvent.findMany({
      where: { userId, entityId: exerciseId },
      orderBy: { createdAt: 'asc' },
    });
    expect(events).toHaveLength(2);
    expect(events[1].data).toMatchObject({
      isCorrect: false,
      attemptNumber: 2,
    });
  });

  it('3rd attempt, now correct: no reveal, attemptNumber keeps counting', async () => {
    const res = await request(app.getHttpServer())
      .post(`/exercises/${exerciseId}/attempts`)
      .send({ answer: { selectedIndices: [0] }, latencyMs: 700 })
      .expect(201);

    expect(res.body).toEqual({ correct: true, attemptNumber: 3 });

    const attempts = await prisma.attempt.findMany({
      where: { userId, exerciseId },
      orderBy: { attemptNumber: 'asc' },
    });
    expect(attempts.map((a) => a.isCorrect)).toEqual([false, false, true]);
  });

  it('rejects a malformed attempt body with 400', async () => {
    await request(app.getHttpServer())
      .post(`/exercises/${exerciseId}/attempts`)
      .send({ answer: {}, latencyMs: -1 })
      .expect(400);
  });

  it('returns 404 for a non-existent exercise id', async () => {
    await request(app.getHttpServer())
      .get('/exercises/does-not-exist')
      .expect(404);
  });
});
