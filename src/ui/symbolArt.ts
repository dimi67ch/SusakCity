import { SYMBOLS, type SymbolId } from '../config/symbols';
import donFace from '../assets/crew/don-face.webp';
import playboyFace from '../assets/crew/playboy-face.webp';
import { iconSvg } from './icons';

/** Gesichts-Ausschnitte der Crew für die Walzen */
const PORTRAITS: Partial<Record<SymbolId, string>> = { don: donFace, playboy: playboyFace };

/**
 * Eigene Symbolgrafiken werden automatisch aus `src/assets/symbols/<id>.<ext>` geladen
 * und haben Vorrang vor den eingebauten Neon-SVG-Icons.
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

  const img = IMAGES[id];
  if (img) {
    el.classList.add('sym--image');
    const i = document.createElement('img');
    i.src = img;
    i.alt = def.name;
    i.draggable = false;
    el.append(i);
    return el;
  }

  if (id === 'wild') {
    el.innerHTML = `
      <div class="sym__plate">
        ${iconSvg('wild')}
        <span class="sym__wild-word">WILD</span>
      </div>`;
    return el;
  }

  const badge = KIND_LABEL[def.kind];
  const label = def.label ?? def.name;
  const portrait = PORTRAITS[id];
  const art = portrait
    ? `<img class="sym__portrait" src="${portrait}" alt="${def.name}" draggable="false" />`
    : (iconSvg(id) ?? '');
  el.innerHTML = `
    <div class="sym__plate${portrait ? ' sym__plate--portrait' : ''}">
      ${art}
      ${badge ? `<span class="sym__badge">${badge}</span>` : ''}
      ${label ? `<span class="sym__name">${label}</span>` : ''}
    </div>`;
  return el;
}
