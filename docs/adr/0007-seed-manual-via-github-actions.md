# 0007 — Seed de contenido manual vía GitHub Actions, no en el CMD del contenedor

## Estado

Aceptado.

## Contexto

Hasta ahora `content:seed` se ejecutaba a mano contra Neon (apuntando
temporalmente el `.env` local a producción), sin trazabilidad ni repetibilidad.
El ADR 0004 ya resolvió un problema parecido para `migrate deploy` metiéndolo
en el `CMD` del contenedor, porque el Pre-Deploy Command de Render es de pago.
Cabía preguntarse si `content:seed` debía seguir el mismo patrón.

## Decisión

`content:seed` contra Neon se dispara manualmente desde un workflow de GitHub
Actions (`workflow_dispatch`, rama `main` únicamente, con un input de
confirmación), usando `PRODUCTION_DATABASE_URL` como secret del repo. No se
añade a ningún `CMD` de contenedor ni se ejecuta automáticamente en cada
deploy o arranque.

## Consecuencias

Ganamos trazabilidad (queda un run de Actions por cada seed) y control
explícito de cuándo se publica contenido nuevo. Difiere de `migrate deploy`
(ADR 0004) a propósito: ese comando es un no-op seguro cuando no hay
migraciones pendientes, mientras que `content:seed` hace un three-way diff que
compara YAML contra Postgres y escribe (upserts + archivado de `VocabItem`
huérfano, ver ADR pendiente sobre soft-delete) en cada ejecución. Meterlo en
el `CMD` significaría repetir ese diff y esas escrituras en cada cold-start
del free tier de Render (el servicio duerme y se reinicia con frecuencia),
añadiendo latencia y churn de escritura sin necesidad: el contenido no cambia
entre cold-starts, solo cuando alguien edita el YAML y decide publicarlo. Coste
asumido: publicar contenido nuevo requiere un paso manual (lanzar el workflow)
en vez de ser automático en cada deploy; aceptable porque los cambios de
contenido son mucho menos frecuentes que los deploys de código.
