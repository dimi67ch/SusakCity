export type Rng = () => number;

/** Deterministischer PRNG (für Walzenstreifen & Simulation). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Kryptografisch starker Zufall für echte Spins. */
export function cryptoRng(): Rng {
  const buf = new Uint32Array(256);
  let i = buf.length;
  return () => {
    if (i >= buf.length) {
      crypto.getRandomValues(buf);
      i = 0;
    }
    return buf[i++] / 4294967296;
  };
}

export function randInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}
