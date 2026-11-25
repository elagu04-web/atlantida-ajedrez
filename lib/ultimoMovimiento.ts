import type { CSSProperties } from 'react';

/** Dos marcas persistentes; la selección, el premove y el jaque tienen prioridad. */
export function estilosUltimoMovimiento(jugada?: { from: string; to: string } | null): Record<string, CSSProperties> {
  if (!jugada || !/^[a-h][1-8]$/.test(jugada.from) || !/^[a-h][1-8]$/.test(jugada.to) || jugada.from === jugada.to) return {};
  return {
    [jugada.from]: { backgroundColor: '#d9b65b99', boxShadow: 'inset 0 0 0 2px #f5d98d88' },
    [jugada.to]: { backgroundColor: '#edc85cb3', boxShadow: 'inset 0 0 0 3px #ffe4a6bb' },
  };
}
