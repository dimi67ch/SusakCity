import { REEL_WEIGHTS, ROWS } from '../config/game';
import type { SymbolId } from '../config/symbols';
import { mulberry32, randInt, type Rng } from './rng';

/** Symbole, die pro Walze höchstens einmal gleichzeitig sichtbar sein dürfen. */
const SPACED: SymbolId[] = ['scatter'];

function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildStrip(weights: Record<SymbolId, number>, rng: Rng): SymbolId[] {
  const length = Object.values(weights).reduce((a, b) => a + b, 0);
  const strip: (SymbolId | null)[] = new Array(length).fill(null);

  // Gespreizte Symbole gleichmäßig verteilen (Abstand >= ROWS)
  let offset = randInt(rng, length);
  for (const id of SPACED) {
    const n = weights[id];
    if (!n) continue;
    if (length / n < ROWS) throw new Error(`Walzenstreifen zu kurz für ${n}x ${id}`);
    for (let i = 0; i < n; i++) {
      let pos = (offset + Math.floor((i * length) / n)) % length;
      while (strip[pos] !== null) pos = (pos + 1) % length;
      strip[pos] = id;
    }
    offset += 2;
  }

  const bag: SymbolId[] = [];
  for (const [id, n] of Object.entries(weights) as [SymbolId, number][]) {
    if (SPACED.includes(id)) continue;
    for (let i = 0; i < n; i++) bag.push(id);
  }
  shuffle(bag, rng);
  let b = 0;
  for (let i = 0; i < length; i++) if (strip[i] === null) strip[i] = bag[b++];
  return strip as SymbolId[];
}

const stripRng = mulberry32(0x5_05a_c17);
export const REEL_STRIPS: SymbolId[][] = REEL_WEIGHTS.map((w) => buildStrip(w, stripRng));
