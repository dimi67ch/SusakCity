import bossUrl from '../../assets/crew/stand-boss.webp';
import donUrl from '../../assets/crew/stand-don.webp';
import playboyUrl from '../../assets/crew/stand-playboy.webp';

/** Casino-Szene: Die Crew steht mit Sonnenbrillen hinter dem Blackjack-Tisch. */

export const SCENE_HTML = `
  <div class="bj__room" aria-hidden="true">
    <div class="bj__bokeh"></div>
    <div class="bj__sign"><span>Susak</span> Casino</div>
  </div>
  <div class="bj__crew" aria-hidden="true">
    <img class="bj-seat bj-seat--boss" src="${bossUrl}" alt="" draggable="false" />
    <img class="bj-seat bj-seat--don" src="${donUrl}" alt="" draggable="false" />
    <img class="bj-seat bj-seat--playboy" src="${playboyUrl}" alt="" draggable="false" />
  </div>
  <svg class="bj__felt" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    <defs>
      <radialGradient id="bj-felt" cx=".5" cy=".3" r=".8">
        <stop offset="0" stop-color="#127a50"/><stop offset=".6" stop-color="#0a4a31"/><stop offset="1" stop-color="#042416"/>
      </radialGradient>
      <linearGradient id="bj-rail" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a2230"/><stop offset=".5" stop-color="#120a10"/><stop offset="1" stop-color="#05030a"/>
      </linearGradient>
      <path id="bj-arc1" d="M 330 250 Q 800 500 1270 250"/>
      <path id="bj-arc2" d="M 420 322 Q 800 540 1180 322"/>
      <path id="bj-arc3" d="M 300 175 Q 800 420 1300 175"/>
    </defs>
    <rect x="0" y="40" width="1600" height="860" fill="url(#bj-felt)"/>
    <rect x="0" y="0" width="1600" height="52" fill="url(#bj-rail)"/>
    <rect x="0" y="50" width="1600" height="3" fill="#ff2e88" opacity=".8"/>
    <rect x="0" y="54" width="1600" height="10" fill="#000" opacity=".35"/>
    <path d="M 240 190 Q 800 470 1360 190" fill="none" stroke="#d9b34a" stroke-width="2.5" opacity=".7"/>
    <path d="M 380 360 Q 800 590 1220 360" fill="none" stroke="#d9b34a" stroke-width="2" opacity=".6"/>
    <path d="M 440 400 Q 800 610 1160 400" fill="none" stroke="#d9b34a" stroke-width="2" opacity=".6"/>
    <text font-family="Anton, Impact, sans-serif" font-size="46" letter-spacing="6" fill="#e8c55a" opacity=".85">
      <textPath href="#bj-arc1" startOffset="50%" text-anchor="middle">BLACKJACK PAYS 3 TO 2</textPath>
    </text>
    <text font-family="Inter, sans-serif" font-weight="600" font-size="20" letter-spacing="3" fill="#e8c55a" opacity=".7">
      <textPath href="#bj-arc2" startOffset="50%" text-anchor="middle">DEALER MUST DRAW TO 16 AND STAND ON ALL 17s</textPath>
    </text>
    <text font-family="Anton, Impact, sans-serif" font-size="24" letter-spacing="5" fill="#e8c55a" opacity=".6">
      <textPath href="#bj-arc3" startOffset="50%" text-anchor="middle">INSURANCE PAYS 2 TO 1</textPath>
    </text>
    <text x="800" y="640" text-anchor="middle" font-family="Yellowtail, cursive" font-size="64" fill="#ff2e88" opacity=".22">Susak City</text>
  </svg>`;
