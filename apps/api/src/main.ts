import './instrument';

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

/**
 * Origen del front permitido por CORS. En local es el puerto en el que
 * realmente esté escuchando `next dev` (puede no ser 3000 si ese puerto está
 * ocupado); en producción, el dominio de Vercel. Sin fallback en producción:
 * si falta, es mejor que el arranque falle a que CORS falle en silencio para
 * todos los usuarios.
 */
function resolveCorsOrigin(): string {
  const origin = process.env.CORS_ORIGIN;
  if (origin) return origin;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN es obligatorio en producción');
  }
  return 'http://localhost:3000';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableCors({ origin: resolveCorsOrigin() });
  await app.listen(process.env.PORT ?? process.env.API_PORT ?? 3000);
}
void bootstrap();
