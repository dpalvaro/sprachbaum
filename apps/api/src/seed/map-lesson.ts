import type { Lesson, Section, Exercise } from '@sprachbaum/content-schema';
import {
  SkillType,
  SectionType,
  ExerciseType,
  VocabGender,
  VocabPartOfSpeech,
} from '@prisma/client';

export interface SectionPlan {
  slug: string;
  order: number;
  type: SectionType;
  skillType: SkillType;
  skillName: string;
  title: unknown;
  content: unknown;
}

export interface VocabItemPlan {
  slug: string;
  sectionSlug: string;
  skillType: SkillType;
  skillName: string;
  order: number;
  lemma: string;
  translation: unknown;
  example: string | null;
  exampleTranslation: unknown;
  audioUrl: string | null;
  partOfSpeech: VocabPartOfSpeech | null;
  gender: VocabGender | null;
  plural: string | null;
}

export interface ExercisePlan {
  slug: string;
  sectionSlug: string;
  skillType: SkillType;
  skillName: string;
  order: number;
  type: ExerciseType;
  payload: unknown;
  solution: unknown;
}

export interface LessonPlan {
  slug: string;
  levelCode: string;
  order: number;
  title: unknown;
  objectives: unknown;
  sections: SectionPlan[];
  vocabItems: VocabItemPlan[];
  exercises: ExercisePlan[];
}

const SECTION_TYPE_TO_SKILL_TYPE: Record<Section['type'], SkillType> = {
  grammar: SkillType.GRAMMAR,
  vocabulary: SkillType.VOCAB_TOPIC,
  reading: SkillType.READING,
  listening: SkillType.LISTENING,
};

function sectionTitle(section: Section): unknown {
  switch (section.type) {
    case 'grammar':
    case 'reading':
    case 'listening':
      return section.title ?? null;
    case 'vocabulary':
      return null;
  }
}

function sectionContent(section: Section): unknown {
  switch (section.type) {
    case 'grammar':
      return { explanation: section.explanation, examples: section.examples };
    case 'vocabulary':
      return { topic: section.topic };
    case 'reading':
      return { text: section.text, glossary: section.glossary };
    case 'listening':
      return { audio: section.audio, transcript: section.transcript };
  }
}

function exercisesOf(section: Section): Exercise[] {
  return section.type === 'reading' || section.type === 'listening'
    ? section.questions
    : section.exercises;
}

/**
 * Separa lo que el cliente puede ver antes de responder ("payload") de lo que
 * solo el corrector del servidor debe conocer ("solution"). Caso especial:
 * `matching`, donde el YAML ya empareja lado a lado la respuesta correcta, así
 * que el payload separa ambos lados (y desalinea su índice) mientras que
 * `solution.pairs` guarda la correspondencia real — el corrector empareja por
 * valor, no por posición, así que el orden de payload.rights es irrelevante
 * para la corrección.
 */
function splitExercise(exercise: Exercise): {
  payload: unknown;
  solution: unknown;
} {
  const base = { prompt: exercise.prompt, skillTag: exercise.skillTag ?? null };

  switch (exercise.type) {
    case 'fill_blank':
      return {
        payload: {
          ...base,
          text: exercise.text,
          blanks: exercise.blanks.map(({ id }) => ({ id })),
        },
        solution: { blanks: exercise.blanks },
      };
    case 'multiple_choice':
      return {
        payload: { ...base, options: exercise.options },
        solution: { correctIndices: exercise.correctIndices },
      };
    case 'matching':
      return {
        payload: {
          ...base,
          lefts: exercise.pairs.map((pair) => pair.left),
          rights: exercise.pairs.map((pair) => pair.right).reverse(),
        },
        solution: { pairs: exercise.pairs },
      };
    case 'sentence_order':
      return {
        payload: { ...base, fragments: exercise.fragments },
        solution: { correctOrder: exercise.correctOrder },
      };
    case 'dictation':
      return {
        payload: { ...base, audio: exercise.audio },
        solution: { expected: exercise.expected },
      };
    case 'short_answer':
      return {
        payload: { ...base },
        solution: {
          accept: exercise.accept,
          caseSensitive: exercise.caseSensitive ?? false,
        },
      };
  }
}

/** Proyecta una Lección validada (content-schema) a filas planas listas para upsert. */
export function buildLessonPlan(lesson: Lesson): LessonPlan {
  const sections: SectionPlan[] = [];
  const vocabItems: VocabItemPlan[] = [];
  const exercises: ExercisePlan[] = [];

  lesson.sections.forEach((section, sectionIndex) => {
    const skillType = SECTION_TYPE_TO_SKILL_TYPE[section.type];
    const skillName = section.slug;

    sections.push({
      slug: section.slug,
      order: sectionIndex,
      type: section.type,
      skillType,
      skillName,
      title: sectionTitle(section),
      content: sectionContent(section),
    });

    if (section.type === 'vocabulary') {
      section.items.forEach((item, itemIndex) => {
        vocabItems.push({
          slug: item.slug,
          sectionSlug: section.slug,
          skillType,
          skillName,
          order: itemIndex,
          lemma: item.lemma,
          translation: item.translation,
          example: item.example ?? null,
          exampleTranslation: item.exampleTranslation ?? null,
          audioUrl: item.audio?.url ?? null,
          partOfSpeech: item.partOfSpeech ?? null,
          gender: item.gender ?? null,
          plural: item.plural ?? null,
        });
      });
    }

    exercisesOf(section).forEach((exercise, exerciseIndex) => {
      const { payload, solution } = splitExercise(exercise);
      exercises.push({
        slug: exercise.slug,
        sectionSlug: section.slug,
        skillType,
        skillName,
        order: exerciseIndex,
        type: exercise.type,
        payload,
        solution,
      });
    });
  });

  return {
    slug: lesson.slug,
    levelCode: lesson.level,
    order: lesson.order,
    title: lesson.title,
    objectives: lesson.objectives,
    sections,
    vocabItems,
    exercises,
  };
}
