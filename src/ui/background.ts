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

/** Schwarzes Coupé (Audi-A5-Silhouette) im Neon-Look, Seitenansicht nach rechts. */
export const CAR_SVG = `
<svg viewBox="0 0 1000 340" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2838"/>
      <stop offset="0.45" stop-color="#0c0b12"/>
      <stop offset="1" stop-color="#050408"/>
    </linearGradient>
    <linearGradient id="car-rim-light" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#00e5ff"/>
      <stop offset="0.45" stop-color="#8b5cf6"/>
      <stop offset="1" stop-color="#ff2e88"/>
    </linearGradient>
    <linearGradient id="car-glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a2440"/>
      <stop offset="0.5" stop-color="#07080f"/>
      <stop offset="0.8" stop-color="#2a0d2a"/>
      <stop offset="1" stop-color="#ff2e88" stop-opacity="0.5"/>
    </linearGradient>
    <radialGradient id="car-rim" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#6b6a78"/>
      <stop offset="0.6" stop-color="#2a2933"/>
      <stop offset="1" stop-color="#0d0c12"/>
    </radialGradient>
    <radialGradient id="car-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ff2e88" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ff2e88" stop-opacity="0"/>
    </radialGradient>
    <g id="car-wheel">
      <circle r="62" fill="#050507"/>
      <circle r="60" fill="none" stroke="#1d1c24" stroke-width="3"/>
      <circle r="44" fill="url(#car-rim)"/>
      <g fill="#0a0a0f">
        <path d="M-5 -40 L5 -40 L7 -8 L-7 -8Z"/>
        <path d="M-5 -40 L5 -40 L7 -8 L-7 -8Z" transform="rotate(72)"/>
        <path d="M-5 -40 L5 -40 L7 -8 L-7 -8Z" transform="rotate(144)"/>
        <path d="M-5 -40 L5 -40 L7 -8 L-7 -8Z" transform="rotate(216)"/>
        <path d="M-5 -40 L5 -40 L7 -8 L-7 -8Z" transform="rotate(288)"/>
      </g>
      <path d="M-30 -22 A36 36 0 0 1 20 -30" fill="none" stroke="#ff2e88" stroke-width="3" opacity="0.8"/>
      <rect x="18" y="-26" width="12" height="30" rx="4" fill="#d6203f"/>
      <circle r="10" fill="#1a1a22" stroke="#4a4955" stroke-width="2"/>
    </g>
  </defs>

  <ellipse cx="520" cy="322" rx="480" ry="22" fill="url(#car-glow)"/>
  <ellipse cx="510" cy="331" rx="430" ry="9" fill="#000" opacity="0.85"/>

  <!-- Karosserie -->
  <path fill="url(#car-body)" d="
    M 110 268 L 96 262 C 88 250 86 232 88 220 C 90 200 100 186 122 180
    L 210 168 C 262 150 322 106 398 92 C 470 80 560 80 612 90
    C 660 100 702 130 738 158 L 900 178 C 930 184 946 196 950 212
    L 952 244 C 952 260 942 268 925 270 L 858 270
    A 70 70 0 0 0 722 270 L 293 272 A 70 70 0 0 0 157 270 Z"/>

  <!-- Fenster -->
  <path fill="url(#car-glass)" d="M 238 166 C 290 138 345 110 402 101 C 480 90 560 91 604 99 C 642 108 675 130 704 158 Z"/>
  <path d="M 520 94 L 516 162" stroke="#0a0910" stroke-width="10"/>
  <path d="M 262 158 C 330 122 420 104 500 100" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="4"/>

  <!-- Neon-Kantenlicht -->
  <path fill="none" stroke="url(#car-rim-light)" stroke-width="5" stroke-linecap="round" d="
    M 122 180 L 210 168 C 262 150 322 106 398 92 C 470 80 560 80 612 90 C 660 100 702 130 738 158 L 900 178 C 930 184 946 196 950 212"/>
  <path fill="none" stroke="url(#car-rim-light)" stroke-width="3" opacity="0.75" d="M 128 206 L 520 196 L 930 206"/>

  <!-- Türen, Griffe -->
  <path fill="none" stroke="#000" stroke-width="2" d="M 516 162 C 512 200 514 240 520 268 M 720 170 L 716 232"/>
  <rect x="455" y="192" width="40" height="7" rx="3.5" fill="#26252f"/>
  <path d="M 700 172 L 740 170 L 742 180 L 706 184Z" fill="#0f0e15"/>

  <!-- Singleframe-Grill & Schweller -->
  <path d="M 928 218 L 950 222 L 950 256 L 930 258Z" fill="#050408" stroke="#2a2933"/>
  <path d="M 293 272 L 722 270" stroke="#ff2e88" stroke-opacity="0.35" stroke-width="3"/>

  <!-- Scheinwerfer (LED) -->
  <path d="M 878 186 L 942 196 L 938 207 L 884 199Z" fill="#dff9ff"/>
  <path d="M 878 186 L 942 196 L 938 207 L 884 199Z" fill="#00e5ff" opacity="0.6" style="filter: blur(6px)"/>

  <!-- Rücklicht -->
  <path d="M 90 196 L 150 186 L 152 195 L 92 206Z" fill="#ff1f3d"/>
  <path d="M 90 196 L 150 186 L 152 195 L 92 206Z" fill="#ff1f3d" opacity="0.7" style="filter: blur(6px)"/>

  <use href="#car-wheel" x="225" y="270"/>
  <use href="#car-wheel" x="790" y="270"/>
</svg>`;

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
