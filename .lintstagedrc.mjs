// ESLint usa flat config, y con flat config una invocación de `eslint` solo
// resuelve el eslint.config.mjs del directorio desde el que se ejecuta (no
// hay cascada automática por carpeta como en el `.eslintrc` clásico). Como
// api, web y shared tienen cada uno su propio eslint.config.mjs, despachamos
// por paquete con `pnpm --filter <pkg> exec`, que cambia el cwd al paquete
// correspondiente antes de invocar eslint.
export default {
  'apps/api/**/*.ts': 'pnpm --filter api exec eslint --fix',
  'apps/web/**/*.{ts,tsx}': 'pnpm --filter web exec eslint --fix',
  'apps/e2e/**/*.ts': 'pnpm --filter @sprachbaum/e2e exec eslint --fix',
  'packages/shared/**/*.ts':
    'pnpm --filter @sprachbaum/shared exec eslint --fix',
  '**/*.{ts,tsx,js,jsx,mjs,cjs,json,md,yml,yaml}': 'prettier --write',
};
