import { Injectable, NotFoundException } from '@nestjs/common';
import { SectionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { PublicExercise } from '../exercises/exercises.service';

export interface LocalizedText {
  es?: string;
  de?: string;
}

interface GrammarExample {
  de: string;
  es?: string;
  note?: LocalizedText;
}

interface GlossaryEntry {
  term: string;
  translation: LocalizedText;
}

export interface PublicVocabItem {
  slug: string;
  lemma: string;
  translation: LocalizedText;
  example: string | null;
  exampleTranslation: LocalizedText | null;
  audioUrl: string | null;
  partOfSpeech: string | null;
  gender: string | null;
  plural: string | null;
}

/**
 * Forma pública de una sección: espeja el discriminado por `type` de
 * content-schema, pero normaliza `questions` (reading/listening en el YAML) a
 * `exercises` en los cuatro casos, para que el runner de lección itere un
 * único campo sin importar el tipo de sección.
 */
export type PublicSection =
  | {
      type: 'grammar';
      slug: string;
      order: number;
      title: LocalizedText | null;
      explanation: LocalizedText;
      examples: GrammarExample[];
      exercises: PublicExercise[];
    }
  | {
      type: 'vocabulary';
      slug: string;
      order: number;
      topic: LocalizedText;
      items: PublicVocabItem[];
      exercises: PublicExercise[];
    }
  | {
      type: 'reading';
      slug: string;
      order: number;
      title: LocalizedText | null;
      text: string;
      glossary: GlossaryEntry[];
      exercises: PublicExercise[];
    }
  | {
      type: 'listening';
      slug: string;
      order: number;
      title: LocalizedText | null;
      audioUrl: string;
      transcript: string;
      exercises: PublicExercise[];
    };

export interface PublicLesson {
  slug: string;
  title: LocalizedText;
  objectives: LocalizedText[];
  sections: PublicSection[];
}

interface RawVocabItem {
  slug: string;
  lemma: string;
  translation: unknown;
  example: string | null;
  exampleTranslation: unknown;
  audioUrl: string | null;
  partOfSpeech: string | null;
  gender: string | null;
  plural: string | null;
}

interface RawSection {
  slug: string;
  type: SectionType;
  order: number;
  title: unknown;
  content: unknown;
  vocabItems: RawVocabItem[];
  exercises: PublicExercise[];
}

function mapVocabItem(item: RawVocabItem): PublicVocabItem {
  return {
    slug: item.slug,
    lemma: item.lemma,
    translation: item.translation as LocalizedText,
    example: item.example,
    exampleTranslation: item.exampleTranslation as LocalizedText | null,
    audioUrl: item.audioUrl,
    partOfSpeech: item.partOfSpeech,
    gender: item.gender,
    plural: item.plural,
  };
}

/**
 * Traduce una fila de `Section` (con su `content` Json opaco) a la forma
 * pública discriminada. `content` nunca incluye datos de corrección: solo
 * prosa/ejemplos/vocabulario, ya separados de `solution` desde el seed
 * (ver map-lesson.ts::sectionContent).
 */
function mapSection(section: RawSection): PublicSection {
  const title = section.title as LocalizedText | null;

  switch (section.type) {
    case SectionType.grammar: {
      const content = section.content as {
        explanation: LocalizedText;
        examples: GrammarExample[];
      };
      return {
        type: 'grammar',
        slug: section.slug,
        order: section.order,
        title,
        explanation: content.explanation,
        examples: content.examples,
        exercises: section.exercises,
      };
    }
    case SectionType.vocabulary: {
      const content = section.content as { topic: LocalizedText };
      return {
        type: 'vocabulary',
        slug: section.slug,
        order: section.order,
        topic: content.topic,
        items: section.vocabItems.map(mapVocabItem),
        exercises: section.exercises,
      };
    }
    case SectionType.reading: {
      const content = section.content as {
        text: string;
        glossary: GlossaryEntry[];
      };
      return {
        type: 'reading',
        slug: section.slug,
        order: section.order,
        title,
        text: content.text,
        glossary: content.glossary,
        exercises: section.exercises,
      };
    }
    case SectionType.listening: {
      const content = section.content as {
        audio: { url: string };
        transcript: string;
      };
      return {
        type: 'listening',
        slug: section.slug,
        order: section.order,
        title,
        audioUrl: content.audio.url,
        transcript: content.transcript,
        exercises: section.exercises,
      };
    }
  }
}

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLessonBySlug(slug: string): Promise<PublicLesson> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      select: {
        slug: true,
        title: true,
        objectives: true,
        sections: {
          orderBy: { order: 'asc' },
          select: {
            slug: true,
            type: true,
            order: true,
            title: true,
            content: true,
            vocabItems: {
              orderBy: { order: 'asc' },
              select: {
                slug: true,
                lemma: true,
                translation: true,
                example: true,
                exampleTranslation: true,
                audioUrl: true,
                partOfSpeech: true,
                gender: true,
                plural: true,
              },
            },
            // Igual que getPublicExercise: el select nunca toca `solution`.
            exercises: {
              orderBy: { order: 'asc' },
              select: { id: true, type: true, order: true, payload: true },
            },
          },
        },
      },
    });
    if (!lesson) {
      throw new NotFoundException(`Lección "${slug}" no encontrada`);
    }

    return {
      slug: lesson.slug,
      title: lesson.title as LocalizedText,
      objectives: lesson.objectives as LocalizedText[],
      sections: lesson.sections.map(mapSection),
    };
  }
}
