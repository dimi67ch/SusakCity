/**
 * Symbol-Definitionen für Susak City.
 *
 * Standardmäßig werden die Neon-SVG-Icons aus `src/ui/icons.ts` verwendet.
 * Eigene Grafiken: lege eine Datei mit der Symbol-ID als Namen in
 * `src/assets/symbols/` ab (z. B. `audi.png`, `wild.webp`, `scatter.webp`).
 * Sie wird beim Build automatisch erkannt und ersetzt das Icon.
 */

export type SymbolId =
  | 'vape'
  | 'hammer'
  | 'gloves'
  | 'honey'
  | 'chain'
  | 'audi'
  | 'wild'
  | 'scatter'
  | 'ace'
  | 'don'
  | 'playboy';

export type SymbolKind = 'low' | 'high' | 'wild' | 'scatter' | 'heist';

export interface SymbolDef {
  id: SymbolId;
  name: string;
  kind: SymbolKind;
  /** Kürzere Beschriftung auf der Kachel (optional) */
  label?: string;
  /** Neon-Farbpaar für Kachel & Glow */
  color: [string, string];
}

export const SYMBOLS: Record<SymbolId, SymbolDef> = {
  vape:     { id: 'vape',     name: 'Vape',            kind: 'low',     color: ['#00e5ff', '#0077ff'] },
  hammer:   { id: 'hammer',   name: 'Vorschlaghammer', label: 'Hammer', kind: 'low',     color: ['#b388ff', '#6a3cff'] },
  gloves:   { id: 'gloves',   name: 'Boxhandschuhe',   kind: 'low',     color: ['#ff4d6d', '#c0002d'] },
  honey:    { id: 'honey',    name: 'Honigglas',       kind: 'high',    color: ['#ffb830', '#ff8a00'] },
  chain:    { id: 'chain',    name: 'Königskette',     kind: 'high',    color: ['#ffe066', '#e0a100'] },
  audi:     { id: 'audi',     name: 'Audi',            kind: 'high',    color: ['#ff2e88', '#ff6a3d'] },
  wild:     { id: 'wild',     name: 'Susak City',      kind: 'wild',    color: ['#ff2e88', '#8b5cf6'] },
  scatter:  { id: 'scatter',  name: 'Goldmaske',       kind: 'scatter', color: ['#ffd84d', '#8b5cf6'] },
  ace:      { id: 'ace',      name: 'Ass',             kind: 'heist',   color: ['#ff5a5a', '#b3002d'] },
  don:      { id: 'don',      name: 'Crew – Schwarzer Anzug', label: '', kind: 'heist', color: ['#ff2e88', '#00e5ff'] },
  playboy:  { id: 'playboy',  name: 'Crew – Weißer Anzug',    label: '', kind: 'heist', color: ['#ff2e88', '#00e5ff'] },
};

export const SYMBOL_IDS = Object.keys(SYMBOLS) as SymbolId[];
export const PAYING_SYMBOLS: SymbolId[] = ['vape', 'hammer', 'gloves', 'honey', 'chain', 'audi'];
export const HEIST_SYMBOLS: SymbolId[] = ['ace', 'don', 'playboy'];
