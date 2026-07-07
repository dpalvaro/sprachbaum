/** @type {import('prettier').Config} */
export default {
  singleQuote: true,
  trailingComma: 'all',
  // Evita diffs de fin de línea entre distintos SO / bind mounts de Docker.
  endOfLine: 'auto',
};
