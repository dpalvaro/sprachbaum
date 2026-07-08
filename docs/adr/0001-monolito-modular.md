# 0001 — Monolito modular

## Estado

Aceptado.

## Contexto

Arrancamos el MVP de una app de aprendizaje de idiomas y hay que decidir la
estructura del backend. Los microservicios desde el día uno añaden complejidad
grande (comunicación entre servicios, despliegues múltiples, observabilidad
distribuida) que no se justifica para un producto sin usuarios todavía.

## Decisión

Monolito modular dentro de un monorepo. Un solo backend NestJS, un solo
despliegue, pero organizado internamente en módulos por dominio (auth,
curriculum, exercises, srs, analytics, billing) con fronteras claras.

## Consecuencias

Ganamos simplicidad de despliegue y desarrollo, un solo lenguaje (TypeScript)
en todo el repo, y velocidad para el MVP. A futuro, si un módulo necesita
escalar aparte (ej. el servicio de evaluación con IA previsto para v2, que se
extraería a cola + worker), la estructura modular permite extraerlo a un
servicio separado sin reescribir todo. Es una decisión reversible por diseño:
empezar monolito y extraer servicios cuando el dolor lo justifique es más
barato que empezar con microservicios y volver atrás.
