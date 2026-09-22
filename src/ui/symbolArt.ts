import { SYMBOLS, type SymbolId } from '../config/symbols';
import donFace from '../assets/crew/don-face.webp';
import playboyFace from '../assets/crew/playboy-face.webp';
import { iconSvg } from './icons';

/** Gesichts-Ausschnitte der Crew für die Walzen */
const PORTRAITS: Partial<Record<SymbolId, string>> = { don: donFace, playboy: playboyFace };

/**
 * Eigene Symbolgrafiken werden automatisch aus `src/assets/symbols/<id>.<ext>` geladen
 * und ersetzen das eingebaute Neon-SVG-Icon auf der Kachel.
 */
const files = import.meta.glob('../assets/symbols/*.{png,webp,jpg,jpeg,svg,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const IMAGES: Partial<Record<SymbolId, string>> = {};
for (const [path, url] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.[^.]+$/, '') as SymbolId;
  if (id in SYMBOLS) IMAGES[id] = url;
}

const KIND_LABEL: Record<string, string> = {
  scatter: 'SCATTER',
  heist: 'BONUS',
};

/** Erzeugt den Inhalt einer Symbolzelle. */
export function renderSymbol(id: SymbolId): HTMLElement {
  const def = SYMBOLS[id];
  const el = document.createElement('div');
  el.className = `sym sym--${def.kind}`;
  el.dataset.id = id;
  el.style.setProperty('--c1', def.color[0]);
  el.style.setProperty('--c2', def.color[1]);

  if (id === 'wild') {
    // Eigenes Bild (z. B. Porträt) füllt die Kachel, sonst das gezeichnete Icon
    const img = IMAGES.wild;
    el.innerHTML = img
      ? `<div class="sym__plate sym__plate--portrait">
           <img class="sym__portrait" src="${img}" alt="${def.name}" draggable="false" />
           <span class="sym__wild-word">WILD</span>
         </div>`
      : `<div class="sym__plate">
           ${iconSvg('wild')}
           <span class="sym__wild-word">WILD</span>
         </div>`;
    return el;
  }

  const badge = KIND_LABEL[def.kind];
  const label = def.label ?? def.name;
  const portrait = PORTRAITS[id];
  const custom = IMAGES[id];
  const art = portrait
    ? `<img class="sym__portrait" src="${portrait}" alt="${def.name}" draggable="false" />`
    : custom
      ? `<img class="sym__icon sym__img" src="${custom}" alt="${def.name}" draggable="false" />`
      : (iconSvg(id) ?? '');
  el.innerHTML = `
    <div class="sym__plate${portrait ? ' sym__plate--portrait' : ''}">
      ${art}
      ${badge ? `<span class="sym__badge">${badge}</span>` : ''}
      ${label ? `<span class="sym__name">${label}</span>` : ''}
    </div>`;
  return el;
}
