import type { PickSymbol } from './engine';

/** Neon-Illustrationen der Pick-Up-Symbole (viewBox 0 0 100 100). */

const DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <radialGradient id="pk-clover" cx=".4" cy=".35" r=".75">
      <stop offset="0" stop-color="#b6ff9e"/><stop offset=".5" stop-color="#2fd35a"/><stop offset="1" stop-color="#0b6b2a"/>
    </radialGradient>
    <linearGradient id="pk-moon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#bfe6ff"/><stop offset="1" stop-color="#4a7bd6"/>
    </linearGradient>
    <radialGradient id="pk-heart" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="#ffb3c4"/><stop offset=".4" stop-color="#ff1f4b"/><stop offset="1" stop-color="#7a0018"/>
    </radialGradient>
    <linearGradient id="pk-star" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6c4"/><stop offset=".45" stop-color="#ffd84d"/><stop offset="1" stop-color="#e08a00"/>
    </linearGradient>
    <linearGradient id="pk-crown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#f0b90b"/><stop offset="1" stop-color="#9a6400"/>
    </linearGradient>
    <linearGradient id="pk-shoe" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffd0a8"/><stop offset=".45" stop-color="#d9824a"/><stop offset="1" stop-color="#7a3a14"/>
    </linearGradient>
  </defs>
</svg>`;

let injected = false;
export function injectPickDefs() {
  if (injected) return;
  injected = true;
  document.body.insertAdjacentHTML('afterbegin', DEFS);
}

const LEAF = 'M50 50 C 34 36, 28 16, 40 12 C 46 10, 50 16, 50 22 C 50 16, 54 10, 60 12 C 72 16, 66 36, 50 50 Z';

const BODIES: Record<PickSymbol, string> = {
  clover: `
    <path d="M52 52 C 58 66, 60 80, 70 92" stroke="#1f8a3c" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${[0, 90, 180, 270].map((a) => `<path d="${LEAF}" transform="rotate(${a} 50 50)" fill="url(#pk-clover)" stroke="#0a4a1d" stroke-width="2"/>`).join('')}
    <path d="M42 18 C 44 16, 46 16, 48 20" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="4" fill="#0b6b2a"/>`,

  moon: `
    <path d="M60 10 A 40 40 0 1 0 60 90 A 46 46 0 0 1 60 10 Z" fill="url(#pk-moon)" stroke="#1f3d7a" stroke-width="2.5"/>
    <circle cx="30" cy="40" r="4" fill="#7fa9dc" opacity=".7"/>
    <circle cx="32" cy="64" r="5" fill="#7fa9dc" opacity=".6"/>
    <circle cx="22" cy="54" r="2.5" fill="#7fa9dc" opacity=".7"/>
    <path d="M78 26 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z" fill="#fff6c4"/>
    <path d="M86 58 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 z" fill="#fff6c4"/>`,

  heart: `
    <path d="M50 88 C 20 66, 8 46, 16 28 C 24 10, 46 12, 50 30 C 54 12, 76 10, 84 28 C 92 46, 80 66, 50 88 Z" fill="url(#pk-heart)" stroke="#4d0010" stroke-width="2.5"/>
    <ellipse cx="30" cy="30" rx="8" ry="5" fill="#fff" opacity=".55" transform="rotate(-35 30 30)"/>`,

  star: `
    <path d="M50 8 L61 38 L93 38 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 L39 38 Z" fill="url(#pk-star)" stroke="#7a4b00" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M50 20 L57 40 L50 58 L43 40 Z" fill="#fff" opacity=".35"/>`,

  crown: `
    <path d="M12 34 L28 58 L40 26 L50 52 L60 26 L72 58 L88 34 L82 76 H18 Z" fill="url(#pk-crown)" stroke="#6b4300" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="16" y="74" width="68" height="12" rx="3" fill="url(#pk-crown)" stroke="#6b4300" stroke-width="2.5"/>
    <circle cx="12" cy="32" r="5" fill="#fff6c4" stroke="#6b4300" stroke-width="1.5"/>
    <circle cx="40" cy="24" r="5" fill="#fff6c4" stroke="#6b4300" stroke-width="1.5"/>
    <circle cx="60" cy="24" r="5" fill="#fff6c4" stroke="#6b4300" stroke-width="1.5"/>
    <circle cx="88" cy="32" r="5" fill="#fff6c4" stroke="#6b4300" stroke-width="1.5"/>
    <circle cx="50" cy="80" r="4" fill="#ff2e88"/>
    <circle cx="32" cy="80" r="3" fill="#00e5ff"/>
    <circle cx="68" cy="80" r="3" fill="#00e5ff"/>`,

  horseshoe: `
    <path d="M24 14 C 12 48, 20 82, 50 88 C 80 82, 88 48, 76 14" fill="none" stroke="#3a1a08" stroke-width="20" stroke-linecap="butt"/>
    <path d="M24 14 C 12 48, 20 82, 50 88 C 80 82, 88 48, 76 14" fill="none" stroke="url(#pk-shoe)" stroke-width="15" stroke-linecap="butt"/>
    ${[
      [22, 30], [19, 48], [24, 66], [36, 79], [64, 79], [76, 66], [81, 48], [78, 30],
    ].map(([x, y]) => `<rect x="${x - 2}" y="${y - 3}" width="4" height="6" rx="1" fill="#3a1a08"/>`).join('')}
    <path d="M22 22 C 16 44, 20 64, 30 74" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>`,
};

const nodeCache = new Map<PickSymbol, Element>();

/** Vorgerenderter Symbol-Knoten (wird nur geklont, nicht neu geparst). */
export function pickIconNode(s: PickSymbol): Node {
  let n = nodeCache.get(s);
  if (!n) {
    const t = document.createElement('template');
    t.innerHTML = pickIcon(s);
    n = t.content.firstElementChild!;
    nodeCache.set(s, n);
  }
  return n.cloneNode(true);
}

/** Neutrale Formen für die Muster auf den Kombi-Feldern */
export type ShapeKind = 'square' | 'circle' | 'triangle' | 'diamond' | 'star' | 'joker';

const SHAPES: Record<ShapeKind, string> = {
  square: '<rect x="14" y="14" width="72" height="72" rx="12"/>',
  circle: '<circle cx="50" cy="50" r="38"/>',
  triangle: '<path d="M50 10 L 90 84 H 10 Z" stroke-linejoin="round"/>',
  diamond: '<path d="M50 8 L 90 50 L 50 92 L 10 50 Z" stroke-linejoin="round"/>',
  star: '<path d="M50 8 L61 38 L93 38 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 L39 38 Z" stroke-linejoin="round"/>',
  // Narrenkappe: seitliche Zipfel hängen nach außen (≠ Krone), Mitte zweifarbig wie beim Harlekin
  joker:
    '<path d="M46 72 C40 38 18 16 10 32 C6 40 8 48 12 54 C16 50 22 58 24 72 Z" stroke-linejoin="round"/>' +
    '<path d="M54 72 C60 38 82 16 90 32 C94 40 92 48 88 54 C84 50 78 58 76 72 Z" stroke-linejoin="round"/>' +
    '<path class="pk-shape__alt" d="M36 72 C38 46 44 26 50 14 C56 26 62 46 64 72 Z" stroke-linejoin="round"/>' +
    '<rect x="20" y="72" width="60" height="14" rx="5"/>' +
    '<circle cx="12" cy="62" r="7"/><circle cx="50" cy="11" r="7"/><circle cx="88" cy="62" r="7"/>',
};

/** `tone` 0 = Hauptgruppe (gold), 1 = zweite Gruppe (cyan) */
export function shapeIcon(kind: ShapeKind, tone: 0 | 1 = 0): string {
  return `<svg class="pk-shape" data-tone="${tone}" viewBox="0 0 100 100" aria-hidden="true">${SHAPES[kind]}</svg>`;
}

export function pickIcon(s: PickSymbol): string {
  return `<svg class="pk-icon" viewBox="0 0 100 100" aria-hidden="true">${BODIES[s]}</svg>`;
}
