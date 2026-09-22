import '@fontsource/anton/400.css';
import '@fontsource/yellowtail/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './styles/main.css';

import { Game } from './game';
import { buildSkyline, CAR_SVG, PALM_SVG } from './ui/background';
import { injectIconDefs } from './ui/icons';
import bossUrl from './assets/scene/boss.webp';

injectIconDefs();
buildSkyline(document.getElementById('city-back') as unknown as SVGSVGElement, 7, 'back');
buildSkyline(document.getElementById('city-front') as unknown as SVGSVGElement, 21, 'front');
document.getElementById('palm-left')!.innerHTML = PALM_SVG;
document.getElementById('palm-right')!.innerHTML = PALM_SVG;
document.getElementById('car')!.innerHTML = CAR_SVG;
const boss = document.getElementById('boss') as HTMLImageElement;
boss.addEventListener('load', () => boss.classList.add('is-loaded'), { once: true });
boss.src = bossUrl;

// Warten bis Schriften geladen sind, damit das Layout nicht springt
void document.fonts.ready.then(() => document.body.classList.add('is-ready'));

new Game();
