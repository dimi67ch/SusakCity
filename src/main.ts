import '@fontsource/anton/400.css';
import '@fontsource/yellowtail/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './styles/main.css';

import { Game } from './game';
import { sfx } from './audio/sfx';
import { buildSkyline, PALM_SVG } from './ui/background';
import { injectIconDefs } from './ui/icons';
import bossUrl from './assets/scene/boss.webp';
import carUrl from './assets/scene/car.webp';

injectIconDefs();
buildSkyline(document.getElementById('city-back') as HTMLImageElement, 7, 'back');
buildSkyline(document.getElementById('city-front') as HTMLImageElement, 21, 'front');
document.getElementById('palm-left')!.innerHTML = PALM_SVG;
document.getElementById('palm-right')!.innerHTML = PALM_SVG;
(document.getElementById('car') as HTMLImageElement).src = carUrl;
const boss = document.getElementById('boss') as HTMLImageElement;
boss.addEventListener('load', () => boss.classList.add('is-loaded'), { once: true });
boss.src = bossUrl;

/**
 * Ladebildschirm: wartet auf Schriften und alle Bilder (Symbole, Crew, Szene),
 * danach schaltet ein Klick den Ton frei und startet das Spiel.
 */
const assets = Object.values(
  import.meta.glob('./assets/**/*.{webp,png,jpg,jpeg,svg,avif}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
);

const boot = document.getElementById('boot')!;
const fill = document.getElementById('boot-fill')!;
const status = document.getElementById('boot-status')!;
const startBtn = document.getElementById('boot-start') as HTMLButtonElement;

const loadAsset = (url: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = url;
  });

async function preload() {
  const jobs: Promise<unknown>[] = [document.fonts.ready, ...assets.map(loadAsset)];
  let done = 0;
  const total = jobs.length;
  await Promise.all(
    jobs.map((p) =>
      p.then(() => {
        done++;
        fill.style.width = `${Math.round((done / total) * 100)}%`;
        status.textContent = `Lade … ${Math.round((done / total) * 100)} %`;
      }),
    ),
  );
  document.body.classList.add('is-ready');
  status.textContent = 'Bereit';
  startBtn.hidden = false;
  startBtn.focus();
}

// ── PWA: Installation anbieten (der Service Worker wird vom Build registriert) ──
const installBtn = document.getElementById('boot-install') as HTMLButtonElement;
let installPrompt: (Event & { prompt(): Promise<void> }) | null = null;

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e as Event & { prompt(): Promise<void> };
  installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
  if (!installPrompt) return;
  installBtn.disabled = true;
  await installPrompt.prompt();
  installPrompt = null;
  installBtn.hidden = true;
});

addEventListener('appinstalled', () => (installBtn.hidden = true));

// Leertaste auf dem Ladebildschirm startet das Spiel, statt dahinter zu spinnen
const onBootKey = (e: KeyboardEvent) => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (!e.repeat && !startBtn.hidden) startBtn.click();
};
addEventListener('keydown', onBootKey, { capture: true });

startBtn.addEventListener('click', () => {
  removeEventListener('keydown', onBootKey, { capture: true });
  sfx.unlock();
  sfx.uiClick();
  boot.classList.add('is-done');
  setTimeout(() => boot.remove(), 600);
});

/**
 * Ruhemodus: Deko-Animationen (Hintergrund, Neon-Ring, Symbol-Glühen) halten an,
 * sobald das Fenster den Fokus verliert oder 20 s lang nichts passiert.
 * Beim nächsten Klick, Tastendruck oder Fokus laufen sie sofort weiter.
 */
function setupCalmMode() {
  const IDLE_MS = 20_000;
  let timer = 0;

  const calm = (on: boolean) => document.body.classList.toggle('is-calm', on);
  const wake = () => {
    calm(false);
    clearTimeout(timer);
    timer = window.setTimeout(() => calm(true), IDLE_MS);
  };

  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const) {
    addEventListener(ev, wake, { passive: true });
  }
  addEventListener('focus', wake);
  addEventListener('blur', () => {
    clearTimeout(timer);
    calm(true);
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? calm(true) : wake()));
  wake();
}

new Game();
setupCalmMode();
void preload();
