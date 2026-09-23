/**
 * Pick-Up: 5 Walzen mit je einem Symbol, 6 gleich wahrscheinliche Symbole.
 * Pro Zug max. 3 Spins. Zwischen den Spins können Walzen gesperrt werden,
 * die dann stehen bleiben. Danach muss ein passendes Feld
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
export const MAX_SPINS = 3;

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
  /** Grundpunkte (× Slot-Einsatz) – Mindestwert des Feldes */
  points: number;
  symbol?: PickSymbol;
  fits: (roll: PickSymbol[]) => boolean;
  /** Tatsächliche Punkte für diesen Wurf (z. B. mehr bei 4 oder 5 gleichen) */
  score?: (roll: PickSymbol[]) => number;
}

/** Punkte eines Feldes für den aktuellen Wurf */
export function fieldScore(f: Field, roll: PickSymbol[]): number {
  return f.score ? f.score(roll) : f.points;
}

/** 3× Symbol: 3 gleiche = 2, 4 gleiche = 4, 5 gleiche = 9 Punkte */
const SYMBOL_POINTS: Record<number, number> = { 3: 2, 4: 4, 5: 9 };

function counts(roll: PickSymbol[]): number[] {
  const m = new Map<PickSymbol, number>();
  for (const s of roll) m.set(s, (m.get(s) ?? 0) + 1);
  return [...m.values()].sort((a, b) => b - a);
}

/** Meiste gleiche Symbole im Wurf */
export const maxSame = (roll: PickSymbol[]) => counts(roll)[0];

/** 2 Gleiche / Joker: wie 3× Symbol gestaffelt, mindestens 1 Punkt */
const sameScore = (roll: PickSymbol[]) => SYMBOL_POINTS[maxSame(roll)] ?? 1;

export const FIELDS: Field[] = [
  ...PICK_SYMBOLS.map<Field>((s) => ({
    id: `three-${s}`,
    label: `3× ${PICK_NAMES[s]}`,
    hint: `3× ${PICK_NAMES[s]} = 2 Punkte · 4× = 4 · 5× = 9`,
    points: 2,
    symbol: s,
    fits: (r) => r.filter((x) => x === s).length >= 3,
    score: (r) => SYMBOL_POINTS[Math.min(5, r.filter((x) => x === s).length)] ?? 2,
  })),
  {
    id: 'pair',
    label: '2 Gleiche',
    hint: 'Mind. 2 gleiche Symbole = 1 Punkt · 3× = 2 · 4× = 4 · 5× = 9',
    points: 1,
    fits: (r) => counts(r)[0] >= 2,
    score: sameScore,
  },
  { id: 'straight', label: '5 Verschiedene', hint: 'Alle 5 Symbole unterschiedlich', points: 3, fits: (r) => counts(r).length === 5 },
  { id: 'fullhouse', label: 'Full House', hint: '3 Gleiche + 2 andere Gleiche', points: 3, fits: (r) => { const c = counts(r); return c[0] === 3 && c[1] === 2; } },
  {
    id: 'four',
    label: '4 Gleiche',
    hint: 'Mind. 4 gleiche Symbole = 4 Punkte · 5× = 9',
    points: 4,
    fits: (r) => counts(r)[0] >= 4,
    score: sameScore,
  },
  { id: 'five', label: '5 Gleiche', hint: 'Alle 5 Symbole gleich', points: 9, fits: (r) => counts(r)[0] === 5 },
  {
    id: 'joker',
    label: 'Joker',
    hint: 'Passt immer = 1 Punkt · 4 gleiche = 4 · 5× = 9',
    points: 1,
    fits: () => true,
    // erst ab 4 gleichen mehr als 1 Punkt
    score: (r) => (maxSame(r) >= 4 ? sameScore(r) : 1),
  },
];

export const FIELD_BY_ID = Object.fromEntries(FIELDS.map((f) => [f.id, f])) as Record<FieldId, Field>;

export function roll(rng: Rng, current?: PickSymbol[], held?: boolean[]): PickSymbol[] {
  return Array.from({ length: REELS }, (_, i) =>
    current && held?.[i] ? current[i] : PICK_SYMBOLS[Math.floor(rng() * PICK_SYMBOLS.length)],
  );
}

/** Einfache Sperr-Strategie (Simulation): das häufigste Symbol behalten. */
export function suggestHolds(r: PickSymbol[]): boolean[] {
  const counts = new Map<PickSymbol, number>();
  for (const s of r) counts.set(s, (counts.get(s) ?? 0) + 1);
  const [best, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return r.map((s) => n >= 2 && s === best);
}

export function fittingFields(r: PickSymbol[], used: Set<FieldId>): Field[] {
  return FIELDS.filter((f) => !used.has(f.id) && f.fits(r));
}

/** Einfache Strategie für Simulation & Tests: beste Punkte für diesen Wurf,
 *  bei Gleichstand die flexiblen Felder (2 Gleiche, Joker) aufheben. */
const KEEP_LAST: Partial<Record<FieldId, number>> = { pair: 1, joker: 2 };

export function bestField(options: Field[], roll: PickSymbol[]): Field | undefined {
  return [...options].sort(
    (a, b) => fieldScore(b, roll) - fieldScore(a, roll) || (KEEP_LAST[a.id] ?? 0) - (KEEP_LAST[b.id] ?? 0),
  )[0];
}
