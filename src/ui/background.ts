import { mulberry32 } from '../engine/rng';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Prozedural generierte Skyline mit beleuchteten Fenstern. */
export function buildSkyline(svg: SVGSVGElement, seed: number, layer: 'back' | 'front') {
  const rnd = mulberry32(seed);
  const W = 1600;
  const H = 400;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  const frag = document.createDocumentFragment();
  const windowColors = ['#ff2e88', '#00e5ff', '#ffd84d', '#ffb86b', '#b388ff'];
  let x = -20;
  while (x < W) {
    const w = (layer === 'back' ? 30 : 45) + rnd() * (layer === 'back' ? 60 : 90);
    const tall = rnd() < 0.18;
    const h = (layer === 'back' ? 120 : 60) + rnd() * (layer === 'back' ? 180 : 140) + (tall ? 90 : 0);
    const y = H - h;
    const b = document.createElementNS(SVG_NS, 'rect');
    b.setAttribute('x', x.toFixed(1));
    b.setAttribute('y', y.toFixed(1));
    b.setAttribute('width', w.toFixed(1));
    b.setAttribute('height', h.toFixed(1));
    b.setAttribute('class', 'bld');
    frag.append(b);

    if (tall && rnd() < 0.7) {
      const ant = document.createElementNS(SVG_NS, 'rect');
      ant.setAttribute('x', (x + w / 2 - 1).toFixed(1));
      ant.setAttribute('y', (y - 40).toFixed(1));
      ant.setAttribute('width', '2');
      ant.setAttribute('height', '40');
      ant.setAttribute('class', 'bld');
      frag.append(ant);
      const light = document.createElementNS(SVG_NS, 'circle');
      light.setAttribute('cx', (x + w / 2).toFixed(1));
      light.setAttribute('cy', (y - 42).toFixed(1));
      light.setAttribute('r', '2.5');
      light.setAttribute('class', 'beacon');
      light.style.animationDelay = `${(rnd() * 2).toFixed(2)}s`;
      frag.append(light);
    }

    // Neon-Kante an manchen Dächern
    if (rnd() < 0.25) {
      const edge = document.createElementNS(SVG_NS, 'rect');
      edge.setAttribute('x', x.toFixed(1));
      edge.setAttribute('y', y.toFixed(1));
      edge.setAttribute('width', w.toFixed(1));
      edge.setAttribute('height', '2');
      edge.setAttribute('fill', windowColors[Math.floor(rnd() * 2)]);
      edge.setAttribute('class', 'neon-edge');
      frag.append(edge);
    }

    const cols = Math.floor(w / 9);
    const rows = Math.floor(h / 12);
    for (let r = 1; r < rows; r++) {
      for (let c = 1; c < cols; c++) {
        if (rnd() > (layer === 'back' ? 0.14 : 0.2)) continue;
        const win = document.createElementNS(SVG_NS, 'rect');
        win.setAttribute('x', (x + c * 9 - 2).toFixed(1));
        win.setAttribute('y', (y + r * 12).toFixed(1));
        win.setAttribute('width', '4');
        win.setAttribute('height', '5');
        win.setAttribute('fill', windowColors[Math.floor(rnd() * windowColors.length)]);
        win.setAttribute('opacity', (0.35 + rnd() * 0.6).toFixed(2));
        frag.append(win);
      }
    }
    x += w + (layer === 'back' ? rnd() * 6 : 2 + rnd() * 14);
  }
  svg.append(frag);
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
