import { run } from '../src/seed/run';

run()
  .then(() => {
    console.log('content:seed completado');
  })
  .catch((error: unknown) => {
    console.error('content:seed falló:', error);
    process.exitCode = 1;
  });
