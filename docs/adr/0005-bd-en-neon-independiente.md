# 0005 — BD en Neon independiente

## Estado

Aceptado.

## Contexto

El MVP necesita una Postgres gestionada en producción (el Postgres del
docker-compose es solo para desarrollo local). Una opción era usar la BD del
mismo proveedor donde vive el backend; otra, una BD independiente.

## Decisión

Usar Neon (Postgres serverless) como base de datos, independiente del
proveedor de backend.

## Consecuencias

Ganamos flexibilidad: no quedamos atados al proveedor de backend. Esta
decisión demostró su valor al permitir cambiar de Fly.io a Render (ADR 0003)
sin tocar la base de datos. Neon tiene free tier cómodo sin tarjeta y encaja
bien con Prisma. Para migraciones Prisma puede requerir separar una conexión
directa de la pooled; se documenta como detalle de configuración.
