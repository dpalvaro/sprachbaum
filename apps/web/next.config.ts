import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {/* config options here */};

export default withSentryConfig(nextConfig, {
  silent: true,
  // No hay SENTRY_AUTH_TOKEN/org/project configurados todavía: se desactiva
  // explícitamente la subida de source maps en vez de depender de que el
  // plugin la salte por falta de credenciales.
  sourcemaps: {
    disable: true,
  },
});
