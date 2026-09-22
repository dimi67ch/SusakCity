/**
 * Simulation des Pick-Up-Bonus (Golden Mask) mit einer einfachen Strategie:
 * Nach Spin 1 nur einlösen, wenn ein Feld ≥ 3 Punkte passt, sonst nochmal drehen.
 * Aufruf: npm run simulate:pickup -- [runden]
 */
import { bestField, FIELDS, fittingFields, roll, type FieldId } from '../src/bonus/pickup/engine';
import { mulberry32 } from '../src/engine/rng';

const N = Number(process.argv[2] ?? 200_000);
const rng = mulberry32(7);
let totalPoints = 0;
let totalFields = 0;
let max = 0;
const fieldHits: Record<string, number> = {};
const dist: Record<number, number> = {};

for (let i = 0; i < N; i++) {
  const used = new Set<FieldId>();
  let points = 0;
  for (;;) {
    let r = roll(rng);
    let opts = fittingFields(r, used);
    const first = bestField(opts);
    if (!first || first.points < 3) {
      r = roll(rng);
      opts = fittingFields(r, used);
    }
    const pick = bestField(opts);
    if (!pick) break;
    used.add(pick.id);
    points += pick.points;
    fieldHits[pick.id] = (fieldHits[pick.id] ?? 0) + 1;
    if (used.size === FIELDS.length) break;
  }
  totalPoints += points;
  totalFields += used.size;
  max = Math.max(max, points);
  dist[used.size] = (dist[used.size] ?? 0) + 1;
}

console.log(`${N.toLocaleString('de-DE')} Runden`);
console.log(`Ø Punkte (= × Einsatz): ${(totalPoints / N).toFixed(2)}`);
console.log(`Ø eingelöste Felder:    ${(totalFields / N).toFixed(2)}`);
console.log(`Max. Punkte:            ${max}`);
console.log('\nFelder pro Runde:');
for (const [k, v] of Object.entries(dist)) console.log(`  ${k.padStart(2)} Felder: ${((v / N) * 100).toFixed(2)} %`);
console.log('\nEinlöse-Quote je Feld:');
for (const f of FIELDS) console.log(`  ${f.label.padEnd(16)} ${(((fieldHits[f.id] ?? 0) / N) * 100).toFixed(1)} %`);
