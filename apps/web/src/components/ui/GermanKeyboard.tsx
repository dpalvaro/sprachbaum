'use client';

const KEYS = ['ä', 'ö', 'ü', 'ß'];

interface GermanKeyboardProps {
  onInsert: (char: string) => void;
  disabled?: boolean;
}

/**
 * Teclado de caracteres especiales alemanes, agnóstico del ejercicio: solo
 * reporta qué carácter se pulsó vía `onInsert`. Quién sabe en qué input (y en
 * qué posición del cursor) insertarlo es responsabilidad de quien lo use —
 * hoy fill_blank, mañana dictation (issue 36) sin tocar este componente.
 * `onMouseDown` con `preventDefault` evita que el botón robe el foco del
 * input activo, para no perder la posición del cursor al pulsar.
 */
export function GermanKeyboard({ onInsert, disabled }: GermanKeyboardProps) {
  return (
    <div
      role="group"
      aria-label="Caracteres especiales alemanes"
      className="flex gap-2"
    >
      {KEYS.map((char) => (
        <button
          key={char}
          type="button"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onInsert(char)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-canvas text-base font-semibold text-ink transition-colors duration-200 hover:border-brand-400 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          {char}
        </button>
      ))}
    </div>
  );
}
