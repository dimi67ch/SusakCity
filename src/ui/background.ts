import { mulberry32 } from '../engine/rng';

/**
 * Prozedural generierte Skyline mit beleuchteten Fenstern.
 * Wird einmalig als SVG-Bild erzeugt: der Browser rastert es nur einmal,
 * statt hunderte DOM-Knoten bei jedem Repaint neu zu zeichnen.
 */
export function buildSkyline(img: HTMLImageElement, seed: number, layer: 'back' | 'front') {
  const rnd = mulberry32(seed);
  const W = 1600;
  const H = 400;
  const back = layer === 'back';
  const bld = back ? '#1a0b2e' : '#09050f';
  const winAlpha = back ? 0.35 : 1;
  const windowColors = ['#ff2e88', '#00e5ff', '#ffd84d', '#ffb86b', '#b388ff'];
  const out: string[] = [];
  let x = -20;
  while (x < W) {
    const w = (back ? 30 : 45) + rnd() * (back ? 60 : 90);
    const tall = rnd() < 0.18;
    const h = (back ? 120 : 60) + rnd() * (back ? 180 : 140) + (tall ? 90 : 0);
    const y = H - h;
    out.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${bld}"/>`);

    if (tall && rnd() < 0.7) {
      out.push(`<rect x="${(x + w / 2 - 1).toFixed(1)}" y="${(y - 40).toFixed(1)}" width="2" height="40" fill="${bld}"/>`);
      out.push(`<circle cx="${(x + w / 2).toFixed(1)}" cy="${(y - 42).toFixed(1)}" r="2.5" fill="#ff2e88"/>`);
      rnd(); // früher: Blink-Verzögerung – hält die Skyline identisch
    }

    // Neon-Kante an manchen Dächern (weicher Schein statt drop-shadow-Filter)
    if (rnd() < 0.25) {
      const c = windowColors[Math.floor(rnd() * 2)];
      out.push(`<rect x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" width="${w.toFixed(1)}" height="6" fill="${c}" opacity="${(0.25 * winAlpha).toFixed(2)}"/>`);
      out.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="2" fill="${c}" opacity="${winAlpha}"/>`);
    }

    const cols = Math.floor(w / 9);
    const rows = Math.floor(h / 12);
    for (let r = 1; r < rows; r++) {
      for (let c = 1; c < cols; c++) {
        if (rnd() > (back ? 0.14 : 0.2)) continue;
        const fill = windowColors[Math.floor(rnd() * windowColors.length)];
        const r0 = 0.35 + rnd() * 0.6;
        const op = back ? winAlpha : r0;
        out.push(`<rect x="${(x + c * 9 - 2).toFixed(1)}" y="${(y + r * 12).toFixed(1)}" width="4" height="5" fill="${fill}" opacity="${op.toFixed(2)}"/>`);
      }
    }
    x += w + (back ? rnd() * 6 : 2 + rnd() * 14);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${out.join('')}</svg>`;
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PALM_SVG = `
<svg viewBox="0 0 400 700" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path class="palm" d="M214 700 C 210 560, 196 420, 172 300 C 164 262, 160 230, 170 196 L 184 198 C 178 232, 182 262, 190 298 C 214 418, 230 560, 236 700 Z"/>
  <g class="palm" transform="translate(176 196)">
    <path d="M0 0 C -60 -50, -140 -40, -200 20 C -140 -10, -70 -10, 0 8 Z"/>
    <path d="M0 0 C -40 -90, -120 -120, -190 -100 C -120 -80, -60 -50, 0 6 Z"/>
    <path d="M0 0 C 10 -90, -20 -150, -70 -190 C -30 -130, -12 -70, 4 4 Z"/>
    <path d="M0 0 C 50 -80, 130 -110, 200 -80 C 130 -70, 70 -40, 2 8 Z"/>
    <path d="M0 0 C 70 -30, 150 -10, 210 50 C 150 20, 80 10, 0 10 Z"/>
    <path d="M0 0 C 40 10, 90 60, 110 140 C 80 80, 40 40, -2 12 Z"/>
    <path d="M0 0 C -40 20, -80 70, -90 150 C -60 90, -30 50, 2 12 Z"/>
    <circle cx="-4" cy="10" r="9"/><circle cx="10" cy="14" r="8"/><circle cx="2" cy="22" r="8"/>
  </g>
</svg>`;
