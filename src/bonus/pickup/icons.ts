import type { PickSymbol } from './engine';
import cloverUrl from '../../assets/symbols/clover.webp';
import moonUrl from '../../assets/symbols/moon.webp';
import heartUrl from '../../assets/symbols/heart.webp';
import starUrl from '../../assets/symbols/star.webp';
import crownUrl from '../../assets/symbols/crown.webp';
import horseshoeUrl from '../../assets/symbols/horseshoe.webp';

/** Illustrationen der Pick-Up-Symbole (im SVG mit viewBox 0 0 100 100). */
const IMAGES: Record<PickSymbol, string> = {
  clover: cloverUrl,
  moon: moonUrl,
  heart: heartUrl,
  star: starUrl,
  crown: crownUrl,
  horseshoe: horseshoeUrl,
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
  return `<svg class="pk-icon" viewBox="0 0 100 100" aria-hidden="true"><image href="${IMAGES[s]}" x="4" y="4" width="92" height="92"/></svg>`;
}
