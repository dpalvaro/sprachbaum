# Sprachbaum — contexto para Claude Code

## Qué es
App de aprendizaje de alemán por niveles MCER (MVP = nivel A1 completo). Pensada como
monorepo pnpm: `apps/web` (Next.js 15), `apps/api` (NestJS), `packages/shared` (tipos+zod).
Plan completo de producto y arquitectura en `docs/plan-mvp.md` — léelo antes de tocar
alcance, modelo de datos o milestones.

## Estado actual del repo
Todavía **no está scaffoldeado**: solo existen `README.md`, `docs/plan-mvp.md` y este
`CLAUDE.md`. La épica E1 (`docs/plan-mvp.md` sección 4) cubre inicializar el monorepo,
Docker Compose, Prisma, CI/CD, etc. No asumas que existen `apps/`, `packages/`,
`docker-compose.yml` ni comandos `pnpm` hasta que esas issues estén hechas.

## Comandos (una vez montada la épica E1)
- `pnpm dev` — levanta web+api (requiere `docker compose up -d` antes)
- `pnpm test` — unit tests (vitest)
- `pnpm test:e2e` — Playwright
- `pnpm db:migrate` — `prisma migrate dev`
- `pnpm content:seed` — carga `content/de/a1` en Postgres

## Convenciones
- TypeScript estricto; nada de `any`
- Validación de entrada con zod en el borde (controllers y formularios)
- Toda mutación de aprendizaje emite un `LearningEvent` (append-only); `SkillMastery`
  y demás vistas se derivan de esos eventos, nunca se escriben a mano
- La corrección de ejercicios SIEMPRE ocurre en el servidor
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`)
- Tests obligatorios para servicios de dominio (`srs`, `exercises`, `analytics`)
- El contenido del curso vive en `content/de/a1` como YAML versionado en git,
  validado por `content-schema` (zod); no se edita directamente en la base de datos

## Arquitectura
Monolito modular (NestJS) a propósito, no microservicios — decisión documentada en
`docs/adr/0001-monolito-modular.md` (una vez creado, issue 8). Ver también
`docs/architecture.md` cuando exista. No introducir microservicios sin un ADR nuevo
que lo justifique.

## Qué NO hacer
- No añadir features fuera del milestone actual (ver GitHub Projects y sección 4 de
  `docs/plan-mvp.md`); lo que no esté en las épicas E1–E9 va a `docs/backlog-v2.md`
- No tocar `content-schema` sin actualizar el seed y los ADR correspondientes
- No implementar IA de corrección de escritura, pronunciación, tracks profesionales,
  niveles A2–C1 ni billing activo — eso es v2/v3, explícitamente fuera de alcance del MVP
