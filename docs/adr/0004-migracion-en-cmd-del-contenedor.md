# 0004 — Migración en CMD del contenedor

## Estado

Aceptado.

## Contexto

El backend en Render (free tier) necesita aplicar las migraciones de Prisma
(`prisma migrate deploy`) en cada despliegue. El patrón preferido es el
Pre-Deploy Command de Render, pero resultó ser exclusivo de planes de pago.

## Decisión

Ejecutar `prisma migrate deploy` en el arranque del contenedor, dentro del
CMD del Dockerfile, encadenado antes del arranque de la app: el binario se
invoca por ruta directa (`./node_modules/.bin/prisma`, no `npx`, para evitar
llamadas de red) y con `exec node dist/main.js` para que Node reciba
correctamente las señales (SIGTERM) como PID 1.

## Consecuencias

Funciona en el free tier sin coste. Si la migración falla, el contenedor no
arranca (encadenado con `&&`), lo que es intencional: preferible un servicio
que no levanta a una API sirviendo contra un esquema desincronizado. Coste
asumido: `migrate deploy` corre en cada arranque del contenedor (incluidos
los cold-starts del free tier), no solo en cada deploy; es seguro porque
Prisma es idempotente (comprueba `_prisma_migrations` y no hace nada si no
hay pendientes) y añade latencia mínima. Como mejora futura, solo si ese caso
borde apareciera, se podrían añadir reintentos al arranque.
