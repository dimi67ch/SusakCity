import { PAYLINES, PAYTABLE, REELS, ROWS, SCATTER_PAYS, SCATTER_TRIGGER } from '../config/game';
import { HEIST_SYMBOLS, type SymbolId } from '../config/symbols';
import { randInt, type Rng } from './rng';
import { REEL_STRIPS } from './strips';

/** grid[reel][row] */
export type Grid = SymbolId[][];
export type Pos = [reel: number, row: number];

export interface LineWin {
  line: number;
  symbol: SymbolId;
  count: number;
  amount: number;
  positions: Pos[];
}

export type BonusId = 'golden' | 'coup';

export interface SpinResult {
  bet: number;
  stops: number[];
  /** Raster wie gelandet */
  grid: Grid;
  /** Raster nach Expanding Wilds */
  finalGrid: Grid;
  expandedReels: number[];
  lineWins: LineWin[];
  scatterCount: number;
  scatterPositions: Pos[];
  scatterWin: number;
  heistPositions: Pos[];
  bonuses: BonusId[];
  totalWin: number;
}

export function gridFromStops(stops: number[]): Grid {
  return stops.map((stop, r) => {
    const strip = REEL_STRIPS[r];
    return Array.from({ length: ROWS }, (_, row) => strip[(stop + row) % strip.length]);
  });
}

function evaluateLines(grid: Grid, lineBet: number): LineWin[] {
  const wins: LineWin[] = [];
  PAYLINES.forEach((rows, line) => {
    const first = grid[0][rows[0]];
    const pays = PAYTABLE[first];
    if (!pays) return;
    let count = 1;
    while (count < REELS) {
      const s = grid[count][rows[count]];
      if (s !== first && s !== 'wild') break;
      count++;
    }
    if (count < 3) return;
    wins.push({
      line,
      symbol: first,
      count,
      amount: pays[count as 3 | 4 | 5] * lineBet,
      positions: rows.slice(0, count).map((row, reel) => [reel, row] as Pos),
    });
  });
  return wins;
}

function findAll(grid: Grid, match: (s: SymbolId) => boolean): Pos[] {
  const out: Pos[] = [];
  grid.forEach((col, reel) => col.forEach((s, row) => match(s) && out.push([reel, row])));
  return out;
}

export function evaluate(grid: Grid, bet: number, stops: number[] = []): SpinResult {
  const lineBet = bet / PAYLINES.length;

  // Expanding Wild: Walzen mit Wild expandieren, sofern sie zu einem Liniengewinn beitragen.
  const wildReels = grid.map((col, r) => (col.includes('wild') ? r : -1)).filter((r) => r >= 0);
  let finalGrid = grid;
  let expandedReels: number[] = [];
  if (wildReels.length) {
    const expanded = grid.map((col, r) => (wildReels.includes(r) ? col.map(() => 'wild' as SymbolId) : col));
    const wins = evaluateLines(expanded, lineBet);
    const maxLen = wins.reduce((m, w) => Math.max(m, w.count), 0);
    expandedReels = wildReels.filter((r) => r < maxLen);
    if (expandedReels.length) {
      finalGrid = grid.map((col, r) => (expandedReels.includes(r) ? col.map(() => 'wild' as SymbolId) : col));
    }
  }

  const lineWins = evaluateLines(finalGrid, lineBet);
  const scatterPositions = findAll(grid, (s) => s === 'scatter');
  const scatterCount = scatterPositions.length;
  const scatterWin = (SCATTER_PAYS[Math.min(scatterCount, 5)] ?? 0) * bet;

  const heistPositions = findAll(grid, (s) => HEIST_SYMBOLS.includes(s));
  const heistComplete = HEIST_SYMBOLS.every((id) => heistPositions.some(([r, row]) => grid[r][row] === id));

  const bonuses: BonusId[] = [];
  if (scatterCount >= SCATTER_TRIGGER) bonuses.push('golden');
  if (heistComplete) bonuses.push('coup');

  const totalWin = lineWins.reduce((a, w) => a + w.amount, 0) + scatterWin;

  return {
    bet,
    stops,
    grid,
    finalGrid,
    expandedReels,
    lineWins,
    scatterCount,
    scatterPositions,
    scatterWin,
    heistPositions: heistComplete ? heistPositions : [],
    bonuses,
    totalWin,
  };
}

export function spin(bet: number, rng: Rng): SpinResult {
  const stops = REEL_STRIPS.map((strip) => randInt(rng, strip.length));
  return evaluate(gridFromStops(stops), bet, stops);
}
