/**
 * Monte-Carlo-Simulation zur Balance der Gewinntabelle.
 * Aufruf: npm run simulate -- [spins]
 */
import { spin } from '../src/engine/slot';
import { mulberry32 } from '../src/engine/rng';
import { REEL_STRIPS } from '../src/engine/strips';

const N = Number(process.argv[2] ?? 2_000_000);
const BET = 100;
const rng = mulberry32(42);

let lineWin = 0;
let scatterWin = 0;
let hits = 0;
let golden = 0;
let heist = 0;
let expanded = 0;
let bigWins = 0;
let maxWin = 0;
const bySymbol: Record<string, number> = {};

const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const r = spin(BET, rng);
  for (const w of r.lineWins) {
    lineWin += w.amount;
    bySymbol[w.symbol] = (bySymbol[w.symbol] ?? 0) + w.amount;
  }
  scatterWin += r.scatterWin;
  if (r.totalWin > 0) hits++;
  if (r.totalWin >= BET * 10) bigWins++;
  if (r.expandedReels.length) expanded++;
  if (r.bonuses.includes('golden')) golden++;
  if (r.bonuses.includes('coup')) heist++;
  maxWin = Math.max(maxWin, r.totalWin);
}

const staked = N * BET;
const pct = (x: number) => ((x / staked) * 100).toFixed(2) + ' %';
const every = (x: number) => (x ? `1 / ${Math.round(N / x)}` : '–');

console.log(`Walzenlängen: ${REEL_STRIPS.map((s) => s.length).join(', ')}`);
console.log(`${N.toLocaleString('de-DE')} Spins in ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
console.log(`RTP gesamt (Basisspiel):  ${pct(lineWin + scatterWin)}`);
console.log(`  davon Linien:           ${pct(lineWin)}`);
console.log(`  davon Scatter:          ${pct(scatterWin)}`);
for (const [s, v] of Object.entries(bySymbol).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${s.padEnd(12)} ${pct(v)}`);
}
console.log(`\nTrefferquote:             ${((hits / N) * 100).toFixed(2)} %`);
console.log(`Expanding Wild:           ${every(expanded)}`);
console.log(`Big Win (>=10x):          ${every(bigWins)}`);
console.log(`Golden-Mask-Bonus:        ${every(golden)}`);
console.log(`Coup-Bonus (Blackjack):   ${every(heist)}`);
console.log(`Max. Gewinn:              ${(maxWin / BET).toFixed(0)}x Einsatz`);
