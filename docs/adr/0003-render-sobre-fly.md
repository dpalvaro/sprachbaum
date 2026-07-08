# 0003 — Render sobre Fly.io

## Estado

Aceptado.

## Contexto

Al desplegar el backend (issue #6) la elección inicial era Fly.io. Se decidió
no introducir tarjeta de crédito (proyecto de estudiante, restricción de
presupuesto consciente) y al verificar se descubrió que Fly eliminó su free
tier para cuentas nuevas: solo un trial de ~2h de VM o 7 días, luego tarjeta
obligatoria.

## Decisión

Usar Render para el backend en vez de Fly.io.

## Consecuencias

Render mantiene free tier permanente sin tarjeta (750h/mes, 512MB RAM),
suficiente para el MVP y para tener el proyecto online. Coste asumido: el free
tier duerme el contenedor tras ~15min de inactividad, con cold-start de
30-50s en la siguiente petición; aceptable para MVP y demos, se migraría a
tier de pago si hubiera usuarios reales. El cambio fue de bajo coste porque la
BD está en Neon aparte (ver ADR 0005): cambiar de proveedor de backend no tocó
la base de datos.
