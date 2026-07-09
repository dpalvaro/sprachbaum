-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('GRAMMAR', 'VOCAB_TOPIC', 'READING', 'LISTENING');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('grammar', 'vocabulary', 'reading', 'listening');

-- CreateEnum
CREATE TYPE "VocabPartOfSpeech" AS ENUM ('noun', 'verb', 'adjective', 'adverb', 'phrase', 'other');

-- CreateEnum
CREATE TYPE "VocabGender" AS ENUM ('der', 'die', 'das');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('fill_blank', 'multiple_choice', 'matching', 'sentence_order', 'dictation', 'short_answer');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "slug" TEXT NOT NULL,
DROP COLUMN "title",
ADD COLUMN     "title" JSONB NOT NULL,
DROP COLUMN "objectives",
ADD COLUMN     "objectives" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "type" "SkillType" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonSkill" (
    "lessonId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "LessonSkill_pkey" PRIMARY KEY ("lessonId","skillId")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "order" INTEGER NOT NULL,
    "title" JSONB,
    "content" JSONB NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "lemma" TEXT NOT NULL,
    "translation" JSONB NOT NULL,
    "example" TEXT,
    "exampleTranslation" JSONB,
    "audioUrl" TEXT,
    "partOfSpeech" "VocabPartOfSpeech",
    "gender" "VocabGender",
    "plural" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "VocabItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "order" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "solution" JSONB NOT NULL,
    "difficulty" INTEGER,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skill_levelId_type_name_key" ON "Skill"("levelId", "type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Section_slug_key" ON "Section"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Section_lessonId_order_key" ON "Section"("lessonId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "VocabItem_slug_key" ON "VocabItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "VocabItem_sectionId_order_key" ON "VocabItem"("sectionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_sectionId_order_key" ON "Exercise"("sectionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonSkill" ADD CONSTRAINT "LessonSkill_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonSkill" ADD CONSTRAINT "LessonSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabItem" ADD CONSTRAINT "VocabItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabItem" ADD CONSTRAINT "VocabItem_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

