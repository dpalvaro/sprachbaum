# 0006 — Contenido versionado en repo

## Estado

Aceptado.

## Contexto

El contenido del curso (lecciones, vocabulario, ejercicios, readings)
necesita un formato y un flujo de gestión. Podría vivir en la base de datos
directamente o como ficheros en el repositorio.

## Decisión

El contenido vive en el repo como ficheros YAML/JSON validados por esquema
(zod), y un comando de seed lo carga en Postgres.

## Consecuencias

Ganamos revisión por PR, diffs legibles, y separación limpia entre contenido
y código. Habilita un pipeline futuro de generación con LLM más revisión
humana en la PR. Coste: el seed debe mantenerse idempotente y el esquema de
contenido versionarse con cuidado.
