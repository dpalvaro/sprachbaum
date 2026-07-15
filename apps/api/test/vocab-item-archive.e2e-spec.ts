import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createEmptyCard } from 'ts-fsrs';
import { SrsCardState } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { DEV_USER_EMAIL } from './../src/dev-user';
import { PrismaService } from './../src/prisma/prisma.service';
import { LessonsService } from './../src/modules/lessons/lessons.service';
import { SrsService } from './../src/modules/srs/srs.service';
import { seedLesson } from './../src/seed/seed-lesson';
import type { LessonPlan } from './../src/seed/map-lesson';

/**
 * Cubre el soft-delete de VocabItem (docs/adr/0007): un re-seed que ya no
 * incluye un item lo archiva en vez de borrarlo (para no romper el FK que
 * SrsCard mantiene contra VocabItem, sin onDelete: Cascade a propósito), lo
 * desarchiva si reaparece, y sigue borrando Section/Exercise huérfanos tal
 * cual (sin excepción). Lección/nivel dedicados ("zz-archive-test"/"ZZ") para
 * no tocar el contenido real de a1-l01 sembrado por content:seed.
 */
describe('VocabItem archive on re-seed (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let lessons: LessonsService;
  let srs: SrsService;
  let userId: string;

  const LESSON_SLUG = 'zz-archive-test';
  const LEVEL_CODE = 'ZZ';
  const KEPT_SECTION = 'zz-vocab-section';
  const DROPPED_SECTION = 'zz-drop-section';
  const KEPT_ITEM = 'zz-item-kept';
  const ARCHIVABLE_ITEM = 'zz-item-archivable';
  const DROPPED_EXERCISE = 'zz-ex-dropped';

  function planWithArchivableItem(): LessonPlan {
    return {
      slug: LESSON_SLUG,
      levelCode: LEVEL_CODE,
      order: 999,
      title: { es: 'Test archivado' },
      objectives: [],
      sections: [
        {
          slug: KEPT_SECTION,
          order: 0,
          type: 'vocabulary',
          skillType: 'VOCAB_TOPIC',
          skillName: KEPT_SECTION,
          title: null,
          content: { topic: 'test' },
        },
        {
          slug: DROPPED_SECTION,
          order: 1,
          type: 'grammar',
          skillType: 'GRAMMAR',
          skillName: DROPPED_SECTION,
          title: { es: 'Se borra' },
          content: { explanation: { es: 'x' }, examples: [] },
        },
      ],
      vocabItems: [
        {
          slug: KEPT_ITEM,
          sectionSlug: KEPT_SECTION,
          skillType: 'VOCAB_TOPIC',
          skillName: KEPT_SECTION,
          order: 0,
          lemma: 'bleiben',
          translation: { es: 'quedarse' },
          example: null,
          exampleTranslation: null,
          audioUrl: null,
          partOfSpeech: null,
          gender: null,
          plural: null,
        },
        {
          slug: ARCHIVABLE_ITEM,
          sectionSlug: KEPT_SECTION,
          skillType: 'VOCAB_TOPIC',
          skillName: KEPT_SECTION,
          order: 1,
          lemma: 'archivieren',
          translation: { es: 'archivar' },
          example: null,
          exampleTranslation: null,
          audioUrl: null,
          partOfSpeech: null,
          gender: null,
          plural: null,
        },
      ],
      exercises: [
        {
          slug: DROPPED_EXERCISE,
          sectionSlug: DROPPED_SECTION,
          skillType: 'GRAMMAR',
          skillName: DROPPED_SECTION,
          order: 0,
          type: 'short_answer',
          payload: { prompt: { es: 'p' } },
          solution: { accept: ['x'], caseSensitive: false },
        },
      ],
    };
  }

  /** Igual que arriba pero sin ARCHIVABLE_ITEM ni DROPPED_SECTION/DROPPED_EXERCISE. */
  function planWithoutArchivableItem(): LessonPlan {
    const plan = planWithArchivableItem();
    return {
      ...plan,
      sections: plan.sections.filter((s) => s.slug !== DROPPED_SECTION),
      vocabItems: plan.vocabItems.filter((v) => v.slug !== ARCHIVABLE_ITEM),
      exercises: [],
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    lessons = app.get(LessonsService);
    srs = app.get(SrsService);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: DEV_USER_EMAIL },
      select: { id: true },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.srsCard.deleteMany({
      where: { vocabItem: { section: { lesson: { slug: LESSON_SLUG } } } },
    });
    await prisma.lesson.deleteMany({ where: { slug: LESSON_SLUG } });
    await prisma.skill.deleteMany({ where: { level: { code: LEVEL_CODE } } });
    await prisma.level.deleteMany({ where: { code: LEVEL_CODE } });
    await app.close();
  });

  it('archives an orphaned VocabItem instead of deleting it, and its SrsCard survives', async () => {
    await seedLesson(prisma, planWithArchivableItem());

    const archivable = await prisma.vocabItem.findUniqueOrThrow({
      where: { slug: ARCHIVABLE_ITEM },
    });
    expect(archivable.archivedAt).toBeNull();

    const empty = createEmptyCard();
    await prisma.srsCard.create({
      data: {
        userId,
        vocabItemId: archivable.id,
        due: empty.due,
        stability: empty.stability,
        difficulty: empty.difficulty,
        elapsedDays: empty.elapsed_days,
        scheduledDays: empty.scheduled_days,
        learningSteps: empty.learning_steps,
        reps: empty.reps,
        lapses: empty.lapses,
        state: SrsCardState.New,
        lastReview: null,
      },
    });

    await seedLesson(prisma, planWithoutArchivableItem());

    const afterReseed = await prisma.vocabItem.findUniqueOrThrow({
      where: { slug: ARCHIVABLE_ITEM },
    });
    expect(afterReseed.archivedAt).not.toBeNull();

    const survivingCard = await prisma.srsCard.findUnique({
      where: {
        userId_vocabItemId: { userId, vocabItemId: archivable.id },
      },
    });
    expect(survivingCard).not.toBeNull();

    const kept = await prisma.vocabItem.findUniqueOrThrow({
      where: { slug: KEPT_ITEM },
    });
    expect(kept.archivedAt).toBeNull();
  });

  it('still hard-deletes orphaned Section and Exercise rows', async () => {
    const droppedSection = await prisma.section.findUnique({
      where: { slug: DROPPED_SECTION },
    });
    expect(droppedSection).toBeNull();

    const droppedExercise = await prisma.exercise.findUnique({
      where: { slug: DROPPED_EXERCISE },
    });
    expect(droppedExercise).toBeNull();
  });

  it('excludes the archived item from the served lesson', async () => {
    const publicLesson = await lessons.getLessonBySlug(LESSON_SLUG);
    const vocabSection = publicLesson.sections.find(
      (s) => s.slug === KEPT_SECTION,
    );
    expect(vocabSection).toBeDefined();
    if (vocabSection?.type !== 'vocabulary') {
      throw new Error('expected a vocabulary section');
    }
    const slugs = vocabSection.items.map((item) => item.slug);
    expect(slugs).toContain(KEPT_ITEM);
    expect(slugs).not.toContain(ARCHIVABLE_ITEM);
  });

  it('excludes the archived item from future SRS sessions', async () => {
    const session = await srs.buildSession(userId);
    const allSlugs = [...session.due, ...session.new].map(
      (card) => card.vocabItem.slug,
    );
    expect(allSlugs).not.toContain(ARCHIVABLE_ITEM);
  });

  it('un-archives a VocabItem that reappears in the YAML', async () => {
    await seedLesson(prisma, planWithArchivableItem());

    const reappeared = await prisma.vocabItem.findUniqueOrThrow({
      where: { slug: ARCHIVABLE_ITEM },
    });
    expect(reappeared.archivedAt).toBeNull();
  });
});
