/**
 * Pick-Up: 5 Walzen mit je einem Symbol, 6 gleich wahrscheinliche Symbole.
 * Pro Zug max. 2 Spins (immer alle Walzen neu), danach muss ein passendes Feld
 * eingelöst werden. Passt nach dem 2. Spin kein freies Feld mehr, endet die Runde.
 * Gewinn = Summe der Punkte aller eingelösten Felder × Slot-Einsatz.
 */
import type { Rng } from '../../engine/rng';

export type PickSymbol = 'clover' | 'moon' | 'heart' | 'star' | 'crown' | 'horseshoe';

export const PICK_SYMBOLS: PickSymbol[] = ['clover', 'moon', 'heart', 'star', 'crown', 'horseshoe'];

export const PICK_NAMES: Record<PickSymbol, string> = {
  clover: 'Kleeblatt',
  moon: 'Mond',
  heart: 'Herz',
  star: 'Stern',
  crown: 'Krone',
  horseshoe: 'Hufeisen',
};

export const REELS = 5;
export const MAX_SPINS = 2;

export type FieldId =
  | `three-${PickSymbol}`
  | 'joker'
  | 'pair'
  | 'fullhouse'
  | 'straight'
  | 'four'
  | 'five';

export interface Field {
  id: FieldId;
  label: string;
  hint: string;
  /** Punkte (× Slot-Einsatz) */
  points: number;
  symbol?: PickSymbol;
  fits: (roll: PickSymbol[]) => boolean;
}

function counts(roll: PickSymbol[]): number[] {
  const m = new Map<PickSymbol, number>();
  for (const s of roll) m.set(s, (m.get(s) ?? 0) + 1);
  return [...m.values()].sort((a, b) => b - a);
}

export const FIELDS: Field[] = [
  ...PICK_SYMBOLS.map<Field>((s) => ({
    id: `three-${s}`,
    label: `3× ${PICK_NAMES[s]}`,
    hint: `Mind. 3× ${PICK_NAMES[s]}`,
    points: 4,
    symbol: s,
    fits: (r) => r.filter((x) => x === s).length >= 3,
  })),
  { id: 'pair', label: '2 Gleiche', hint: 'Mind. 2 gleiche Symbole', points: 1, fits: (r) => counts(r)[0] >= 2 },
  { id: 'straight', label: '5 Verschiedene', hint: 'Alle 5 Symbole unterschiedlich', points: 3, fits: (r) => counts(r).length === 5 },
  { id: 'fullhouse', label: 'Full House', hint: '3 Gleiche + 2 andere Gleiche', points: 6, fits: (r) => { const c = counts(r); return c[0] === 3 && c[1] === 2; } },
  { id: 'four', label: '4 Gleiche', hint: 'Mind. 4 gleiche Symbole', points: 12, fits: (r) => counts(r)[0] >= 4 },
  { id: 'five', label: '5 Gleiche', hint: 'Alle 5 Symbole gleich', points: 50, fits: (r) => counts(r)[0] === 5 },
  { id: 'joker', label: 'Joker', hint: 'Passt immer', points: 1, fits: () => true },
];

export const FIELD_BY_ID = Object.fromEntries(FIELDS.map((f) => [f.id, f])) as Record<FieldId, Field>;

export function roll(rng: Rng): PickSymbol[] {
  return Array.from({ length: REELS }, () => PICK_SYMBOLS[Math.floor(rng() * PICK_SYMBOLS.length)]);
}

export function fittingFields(r: PickSymbol[], used: Set<FieldId>): Field[] {
  return FIELDS.filter((f) => !used.has(f.id) && f.fits(r));
}

/** Einfache Strategie für Simulation & Tests: beste Punkte, Joker zuletzt. */
export function bestField(options: Field[]): Field | undefined {
  return [...options].sort((a, b) => b.points - a.points || (a.id === 'joker' ? 1 : b.id === 'joker' ? -1 : 0))[0];
}
