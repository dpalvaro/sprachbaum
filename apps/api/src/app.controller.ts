import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // TODO: temporal, eliminar tras verificar Sentry en producción
  @Get('debug-sentry')
  getDebugSentry(): never {
    throw new Error('Sentry backend test');
  }
}
