import type { SymbolId } from './symbols';

export const REELS = 5;
export const ROWS = 5;

/**
 * Gewinnlinien: Zeilenindex (0 = oben … 4 = unten) je Walze.
 * 3 gerade Linien (Reihe 2–4) + V + umgedrehtes V.
 */
export const PAYLINES: number[][] = [
  [2, 2, 2, 2, 2], // Linie 1 – Mitte
  [1, 1, 1, 1, 1], // Linie 2 – Reihe 2
  [3, 3, 3, 3, 3], // Linie 3 – Reihe 4
  [0, 2, 4, 2, 0], // Linie 4 – V
  [4, 2, 0, 2, 4], // Linie 5 – Λ
];

export const PAYLINE_COLORS = ['#ff2e88', '#00e5ff', '#ffd84d', '#8b5cf6', '#3dffa8'];

/** Linien-Auszahlung als Vielfaches des Linieneinsatzes (Gesamteinsatz / 5). Index = Anzahl in Folge. */
export const PAYTABLE: Partial<Record<SymbolId, Record<3 | 4 | 5, number>>> = {
  vape:   { 3: 3,   4: 7,   5: 22 },
  hammer: { 3: 4,   4: 10,  5: 36 },
  gloves: { 3: 5,   4: 14,  5: 64 },
  honey:  { 3: 10,  4: 32,  5: 128 },
  chain:  { 3: 15,  4: 50,  5: 250 },
  audi:   { 3: 32,  4: 128, 5: 640 },
};

/** Scatter-Auszahlung als Vielfaches des Gesamteinsatzes. */
export const SCATTER_PAYS: Record<number, number> = { 3: 2, 4: 10, 5: 50 };
export const SCATTER_TRIGGER = 3;

export const BET_LEVELS = [10, 20, 50, 100, 200, 500, 1000];
export const DEFAULT_BET_INDEX = 1;
export const START_BALANCE = 10_000;

/** Big-Win-Schwellen (Gewinn / Einsatz) */
export const BIG_WIN_TIERS = [
  { name: 'BIG WIN', min: 10 },
  { name: 'MEGA WIN', min: 25 },
  { name: 'EPIC WIN', min: 50 },
] as const;

export const TIMING = {
  normal: { firstStop: 1000, stagger: 250, anticipation: 1100 },
  turbo: { firstStop: 420, stagger: 90, anticipation: 600 },
};

/**
 * Walzen-Gewichte (Anzahl je Symbol pro Walzenstreifen).
 * Wild nur auf Walzen 2–4. Scatter max. 1 pro sichtbarem Walzenausschnitt.
 * Heist-Symbole: je Symbol nur auf 2 Walzen (Ass 1+3, Crew Schwarz 2+4, Crew Weiß 3+5),
 * ausgelöst wird trotzdem, sobald alle drei irgendwo sichtbar sind.
 */
export const REEL_WEIGHTS: Record<SymbolId, number>[] = [
  { vape: 13, hammer: 12, gloves: 11, honey: 8, chain: 6, audi: 4, wild: 0, scatter: 1, ace: 1, don: 0, playboy: 0 },
  { vape: 13, hammer: 12, gloves: 11, honey: 8, chain: 6, audi: 4, wild: 1, scatter: 1, ace: 0, don: 1, playboy: 0 },
  { vape: 13, hammer: 12, gloves: 11, honey: 8, chain: 6, audi: 4, wild: 2, scatter: 1, ace: 1, don: 0, playboy: 1 },
  { vape: 13, hammer: 12, gloves: 11, honey: 8, chain: 6, audi: 4, wild: 1, scatter: 1, ace: 0, don: 1, playboy: 0 },
  { vape: 13, hammer: 12, gloves: 11, honey: 8, chain: 6, audi: 4, wild: 0, scatter: 1, ace: 0, don: 0, playboy: 1 },
];
