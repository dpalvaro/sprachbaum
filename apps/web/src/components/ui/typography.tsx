import type { ElementType, ReactNode } from 'react';

interface TextProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

/**
 * Lengua objetivo (alemán): máximo peso visual — es lo que el usuario debe
 * fijar. Reutilizable fuera de multiple_choice: la misma distinción aplica al
 * texto de fill_blank, al reading, al listening y al vocabulario.
 */
export function TargetText({
  children,
  as: Component = 'span',
  className = '',
}: TextProps) {
  return (
    <Component
      className={`font-semibold tracking-tight text-ink ${className}`}
      lang="de"
    >
      {children}
    </Component>
  );
}

/**
 * Lengua de apoyo (español): instrucciones, traducciones — se retira
 * visualmente sin desaparecer, para no competir con la lengua objetivo.
 */
export function SupportText({
  children,
  as: Component = 'span',
  className = '',
}: TextProps) {
  return (
    <Component className={`font-medium text-ink-muted ${className}`} lang="es">
      {children}
    </Component>
  );
}
