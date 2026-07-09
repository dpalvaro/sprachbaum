import { Prisma, PrismaClient } from '@prisma/client';
import type { LessonPlan } from './map-lesson';

type Tx = Prisma.TransactionClient;

/** `notIn: []` no excluye nada (coincide con todo): sustituye por un slug imposible. */
function notInSafely(slugs: string[]): string[] {
  return slugs.length > 0 ? slugs : ['__none__'];
}

/**
 * Aplica una `LessonPlan` a Postgres de forma idempotente: upsert por slug de
 * cada entidad, y borrado de huérfanos (filas que existían para esta lección
 * y ya no aparecen en el YAML), todo dentro de una transacción.
 */
export async function seedLesson(
  prisma: PrismaClient,
  plan: LessonPlan,
): Promise<void> {
  await prisma.$transaction(async (tx: Tx) => {
    const level = await tx.level.upsert({
      where: { code: plan.levelCode },
      update: {},
      create: { code: plan.levelCode },
    });

    const lesson = await tx.lesson.upsert({
      where: { slug: plan.slug },
      update: {
        levelId: level.id,
        order: plan.order,
        title: plan.title as Prisma.InputJsonValue,
        objectives: plan.objectives as Prisma.InputJsonValue,
      },
      create: {
        slug: plan.slug,
        levelId: level.id,
        order: plan.order,
        title: plan.title as Prisma.InputJsonValue,
        objectives: plan.objectives as Prisma.InputJsonValue,
      },
    });

    // Snapshot de secciones existentes ANTES de mutar: necesario para poder
    // detectar vocab items huérfanos incluso si su sección desaparece entera.
    const existingSections = await tx.section.findMany({
      where: { lessonId: lesson.id },
      select: { id: true },
    });

    const sectionIdBySlug = new Map<string, string>();
    const skillIdBySlug = new Map<string, string>();

    for (const section of plan.sections) {
      const skill = await tx.skill.upsert({
        where: {
          levelId_type_name: {
            levelId: level.id,
            type: section.skillType,
            name: section.skillName,
          },
        },
        update: {},
        create: {
          levelId: level.id,
          type: section.skillType,
          name: section.skillName,
        },
      });
      skillIdBySlug.set(section.slug, skill.id);

      await tx.lessonSkill.upsert({
        where: {
          lessonId_skillId: { lessonId: lesson.id, skillId: skill.id },
        },
        update: { order: section.order },
        create: {
          lessonId: lesson.id,
          skillId: skill.id,
          order: section.order,
        },
      });

      const sectionRow = await tx.section.upsert({
        where: { slug: section.slug },
        update: {
          lessonId: lesson.id,
          skillId: skill.id,
          type: section.type,
          order: section.order,
          title: section.title ?? Prisma.JsonNull,
          content: section.content as Prisma.InputJsonValue,
        },
        create: {
          slug: section.slug,
          lessonId: lesson.id,
          skillId: skill.id,
          type: section.type,
          order: section.order,
          title: section.title ?? Prisma.JsonNull,
          content: section.content as Prisma.InputJsonValue,
        },
      });
      sectionIdBySlug.set(section.slug, sectionRow.id);
    }

    for (const item of plan.vocabItems) {
      const sectionId = sectionIdBySlug.get(item.sectionSlug);
      const skillId = skillIdBySlug.get(item.sectionSlug);
      if (!sectionId || !skillId) {
        throw new Error(
          `VocabItem "${item.slug}" referencia una sección desconocida "${item.sectionSlug}"`,
        );
      }
      await tx.vocabItem.upsert({
        where: { slug: item.slug },
        update: {
          sectionId,
          skillId,
          lemma: item.lemma,
          translation: item.translation as Prisma.InputJsonValue,
          example: item.example,
          exampleTranslation: item.exampleTranslation ?? Prisma.JsonNull,
          audioUrl: item.audioUrl,
          partOfSpeech: item.partOfSpeech,
          gender: item.gender,
          plural: item.plural,
          order: item.order,
        },
        create: {
          slug: item.slug,
          sectionId,
          skillId,
          lemma: item.lemma,
          translation: item.translation as Prisma.InputJsonValue,
          example: item.example,
          exampleTranslation: item.exampleTranslation ?? Prisma.JsonNull,
          audioUrl: item.audioUrl,
          partOfSpeech: item.partOfSpeech,
          gender: item.gender,
          plural: item.plural,
          order: item.order,
        },
      });
    }

    for (const exercise of plan.exercises) {
      const sectionId = sectionIdBySlug.get(exercise.sectionSlug);
      const skillId = skillIdBySlug.get(exercise.sectionSlug);
      if (!sectionId || !skillId) {
        throw new Error(
          `Exercise "${exercise.slug}" referencia una sección desconocida "${exercise.sectionSlug}"`,
        );
      }
      await tx.exercise.upsert({
        where: { slug: exercise.slug },
        update: {
          lessonId: lesson.id,
          sectionId,
          skillId,
          type: exercise.type,
          order: exercise.order,
          payload: exercise.payload as Prisma.InputJsonValue,
          solution: exercise.solution as Prisma.InputJsonValue,
        },
        create: {
          slug: exercise.slug,
          lessonId: lesson.id,
          sectionId,
          skillId,
          type: exercise.type,
          order: exercise.order,
          payload: exercise.payload as Prisma.InputJsonValue,
          solution: exercise.solution as Prisma.InputJsonValue,
        },
      });
    }

    // Borrado de huérfanos, todo scopeado a esta lección.
    await tx.vocabItem.deleteMany({
      where: {
        sectionId: { in: existingSections.map((s) => s.id) },
        slug: { notIn: notInSafely(plan.vocabItems.map((v) => v.slug)) },
      },
    });
    await tx.exercise.deleteMany({
      where: {
        lessonId: lesson.id,
        slug: { notIn: notInSafely(plan.exercises.map((e) => e.slug)) },
      },
    });
    await tx.section.deleteMany({
      where: {
        lessonId: lesson.id,
        slug: { notIn: notInSafely(plan.sections.map((s) => s.slug)) },
      },
    });
    await tx.lessonSkill.deleteMany({
      where: {
        lessonId: lesson.id,
        skillId: { notIn: notInSafely([...skillIdBySlug.values()]) },
      },
    });
  });
}
