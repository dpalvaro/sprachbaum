# 0002 — Prisma 6 sobre 7

## Estado

Aceptado.

## Contexto

Al configurar Prisma (issue #3), el instalador traía Prisma 7 por defecto,
recién salido. Había que decidir entre adoptar la 7 o fijar la 6.

## Decisión

Fijar Prisma 6, no 7.

## Consecuencias

Prisma 7 es un cambio mayor (elimina el motor de Rust, mueve la config a
`prisma.config.ts`, requiere driver adapters, cambia rutas de import) y en ese
momento tenía bugs abiertos de conexión a BD local y poca
documentación/ejemplos; casi todo el ecosistema seguía en 6. Como el proyecto
está empezando y nos apoyamos en documentación y ejemplos maduros, adoptar una
versión .0 recién salida para los cimientos era riesgo innecesario. Coste
asumido: quedamos una versión por detrás. Migrar a 7 más adelante, con el
proyecto sólido y la 7 más pulida, será un PR acotado; queda anotado en el
backlog de v2.
