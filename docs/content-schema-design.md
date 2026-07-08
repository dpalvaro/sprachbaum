# Diseño del content-schema (M2 · issue #16)

> Especificación del modelo de contenido del curso. Sirve como: (1) referencia de diseño, (2) spec para implementar el schema en zod en `packages/content-schema`, y (3) base del gold standard de la lección 1.
>
> Decisiones fijadas: lección = lista de **secciones tipadas**; texto explicativo como **objeto multilingüe `{es, de}`**; **validación estructural** en el MVP, validaciones pedagógicas cruzadas aplazadas.

---

## 1. Principios de diseño

1. **El schema se arrastra para siempre.** Es la decisión más condicionante de toda la fase de producto: sobre él se construye A1 entero, luego A2–C1, y los tracks profesionales. Prioriza la previsión razonable sobre la simplicidad inmediata donde el coste de migrar sería alto (de ahí el objeto multilingüe).
2. **Contenido versionado en el repo** (ADR 0006): ficheros YAML validados por zod, cargados a Postgres con el seed.
3. **Slugs estables como identidad.** Todo lo referenciable (lección, sección, item de vocab, ejercicio) lleva un `slug`/`id` estable, para que el seed sea idempotente (upsert por slug) y para poder referenciar entre piezas.
4. **La corrección vive en el servidor.** El schema incluye las soluciones, pero éstas nunca se envían al cliente; el motor de ejercicios corrige server-side (coherente con CLAUDE.md).
5. **Validación estructural ahora, pedagógica después.** El MVP valida forma (YAML bien formado, soluciones presentes y coherentes con su tipo, slugs únicos). Las validaciones cruzadas pedagógicas (p. ej. "toda palabra del reading está en el vocabulario acumulado") se aplazan a cuando haya varias lecciones y la inconsistencia duela.

---

## 2. Tipos base

### LocalizedText
Objeto multilingüe. En A1 se rellena `es` (y opcionalmente `de`); a niveles altos migra a `de` para inmersión, sin rediseñar el schema.

```
LocalizedText = {
  es?: string
  de?: string
}
```
Regla de validación: al menos uno de los dos presente. Regla de presentación (no del schema): mostrar según preferencia del usuario con fallback al otro locale.

### MediaRef
Referencia a un audio (listenings, ejemplos de vocab, dictados).
```
MediaRef = {
  url: string        // R2/S3 en prod
  durationSec?: number
  transcriptSlug?: string
}
```

---

## 3. Lección

```
Lesson = {
  slug: string           // 'a1-l01-hallo' — estable, único
  level: string          // 'A1'
  order: number          // posición dentro del nivel
  title: LocalizedText
  objectives: LocalizedText[]   // objetivos comunicativos (MCER)
  sections: Section[]           // lista ORDENADA de secciones tipadas
}
```

`sections` es una unión discriminada por `type`: `grammar | vocabulary | reading | listening`. El orden del array es el orden pedagógico en que el estudiante recorre la lección.

---

## 4. Secciones

Todas comparten: `slug` (único dentro de la lección), `type`, y un `title: LocalizedText` opcional.

### 4.1 GrammarSection
```
{
  type: 'grammar'
  slug: string
  title?: LocalizedText
  explanation: LocalizedText     // texto explicativo (soporta markdown ligero)
  examples: GrammarExample[]     // ejemplos destacados
  exercises: Exercise[]
}

GrammarExample = {
  de: string                     // la frase/estructura en alemán
  es?: string                    // traducción/aclaración
  note?: LocalizedText           // matiz opcional
}
```

### 4.2 VocabularySection
Sus `items` son los que generan las `SrsCard` del estudiante.
```
{
  type: 'vocabulary'
  slug: string
  topic: LocalizedText           // 'Saludos', 'Números'...
  items: VocabItem[]
  exercises: Exercise[]
}

VocabItem = {
  slug: string                   // estable, único (clave del SRS)
  lemma: string                  // palabra alemana (forma de diccionario)
  translation: LocalizedText
  example?: string               // frase de ejemplo en alemán
  exampleTranslation?: LocalizedText
  audio?: MediaRef
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'other'
  gender?: 'der' | 'die' | 'das' // solo sustantivos
  plural?: string                // solo sustantivos
}
```

### 4.3 ReadingSection
```
{
  type: 'reading'
  slug: string
  title?: LocalizedText
  text: string                   // texto graduado en alemán
  glossary: GlossaryEntry[]      // para el tap-to-translate
  questions: Exercise[]          // comprensión (normalmente multiple_choice / short_answer)
}

GlossaryEntry = {
  term: string                   // palabra/expresión tal como aparece
  translation: LocalizedText
}
```

### 4.4 ListeningSection
```
{
  type: 'listening'
  slug: string
  title?: LocalizedText
  audio: MediaRef
  transcript: string             // ocultable en la UI
  questions: Exercise[]
}
```

---

## 5. Ejercicios (tipo reutilizable)

Un `Exercise` es una unión discriminada por `type`. Todos comparten:
```
ExerciseBase = {
  slug: string                   // único dentro de la lección
  prompt: LocalizedText          // enunciado
  skillTag?: string              // etiqueta de skill (para analytics/mastery), p.ej. 'grammar:sein'
}
```
Los seis tipos del MVP:

### 5.1 fill_blank
```
{
  type: 'fill_blank'
  text: string                   // usa marcadores para huecos, p.ej. "Ich ___ Anna."
  blanks: Blank[]
}
Blank = {
  id: string
  accept: string[]               // respuestas aceptadas
  caseSensitive?: boolean         // por defecto false
  // Nota impl.: tolerancia a espacios y normalización de ä/ö/ü/ß + teclado en pantalla
}
```

### 5.2 multiple_choice
```
{
  type: 'multiple_choice'
  options: LocalizedText[]        // o string[] si son en alemán
  correctIndices: number[]        // uno o varios (permite multi-respuesta)
}
```

### 5.3 matching
```
{
  type: 'matching'
  pairs: { left: string; right: LocalizedText }[]
}
```

### 5.4 sentence_order
```
{
  type: 'sentence_order'
  fragments: string[]             // en orden desordenado de presentación
  correctOrder: number[]          // índices en el orden correcto
}
```

### 5.5 dictation
```
{
  type: 'dictation'
  audio: MediaRef
  expected: string                // texto esperado; corrección por distancia de edición
}
```

### 5.6 short_answer (comprensión abierta simple)
```
{
  type: 'short_answer'
  accept: string[]                // respuestas aceptadas (comprensión de reading/listening)
  caseSensitive?: boolean
}
```
> Nota: la "comprensión" de readings/listenings se modela reutilizando `multiple_choice` o `short_answer` dentro de `questions[]`. No hace falta un tipo aparte.

---

## 6. Qué valida el seed (MVP)

Validación **estructural** (con zod + checks simples), no pedagógica:
- YAML conforme al schema (tipos, campos requeridos).
- `slug` únicos en su ámbito (lección global; sección/ejercicio/vocab dentro de la lección).
- Cada ejercicio tiene solución coherente con su `type` (p. ej. `correctIndices` dentro del rango de `options`; `correctOrder` es permutación válida de `fragments`).
- `LocalizedText` con al menos un locale.
- Seed **idempotente**: upsert por slug (re-ejecutar no duplica).

Aplazado a más adelante (documentado, no implementado): validaciones cruzadas pedagógicas (vocabulario acumulado, dificultad progresiva, cobertura de objetivos).

---

## 7. Relación con el modelo de datos existente

El schema de contenido (YAML) es la **fuente de autoría**; el seed lo proyecta a las tablas Prisma (sección 3.4 del plan-mvp). Correspondencias:
- `Lesson` (YAML) → tabla `Lesson` (+ `objectives`).
- `VocabItem` → tabla `VocabItem` (y genera `SrsCard` por usuario al estudiarse).
- `Exercise` → tabla `Exercise` (`payload`/`solution` en JSONB desde el YAML).
- `skillTag` → alimenta `Skill` / `SkillMastery`.
- Las secciones se materializan como el orden/estructura que el runner de lección consume.

> El schema de contenido y el schema de base de datos son deliberadamente distintos: el primero está optimizado para autoría humana (legible, anidado); el segundo para consulta (normalizado). El seed es el puente.

---

## 8. Ubicación en el repo

```
packages/content-schema/     # el schema zod + tipos derivados
  src/index.ts               # exporta los tipos y el validador
content/de/a1/               # el contenido en YAML
  a1-l01-hallo.yaml
  ...
```

El `content:seed` (issue #17) lee `content/de/a1/*.yaml`, valida con `packages/content-schema`, y hace upsert en Postgres.

---

## 9. Próximos pasos

1. Revisar/aprobar este diseño.
2. Diseñar el **syllabus de A1** (12 lecciones con objetivos) — decide qué contenido concreto va en cada una.
3. Escribir la **lección 1 a mano** como gold standard, conforme a este schema.
4. Pasar a Claude Code: implementar `packages/content-schema` en zod (issue #16) y el seed (issue #17).
