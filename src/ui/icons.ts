import type { SymbolId } from '../config/symbols';

/**
 * Neon-Illustrationen der Symbole als SVG (viewBox 0 0 100 100).
 * Verläufe liegen einmalig in einem globalen <defs>-Block (siehe injectIconDefs),
 * damit die geklonten Walzen-Zellen keine doppelten IDs erzeugen.
 */

export const ICON_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="ic-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6c4"/><stop offset=".35" stop-color="#ffd84d"/>
      <stop offset=".7" stop-color="#e0a100"/><stop offset="1" stop-color="#8a5a00"/>
    </linearGradient>
    <linearGradient id="ic-gold-h" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#f0b90b"/><stop offset="1" stop-color="#9a6400"/>
    </linearGradient>
    <linearGradient id="ic-chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#c3c9d6"/>
      <stop offset=".55" stop-color="#6b7385"/><stop offset="1" stop-color="#e3e7ef"/>
    </linearGradient>
    <linearGradient id="ic-steel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9deea"/><stop offset=".5" stop-color="#6d7488"/><stop offset="1" stop-color="#2c3040"/>
    </linearGradient>
    <linearGradient id="ic-wood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6b3a16"/><stop offset=".5" stop-color="#b8743a"/><stop offset="1" stop-color="#5a2e10"/>
    </linearGradient>
    <linearGradient id="ic-vape" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#00e5ff"/><stop offset=".55" stop-color="#6a3cff"/><stop offset="1" stop-color="#ff2e88"/>
    </linearGradient>
    <radialGradient id="ic-glove" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="#ff8fa3"/><stop offset=".35" stop-color="#ff1f4b"/><stop offset="1" stop-color="#7a0018"/>
    </radialGradient>
    <linearGradient id="ic-honey" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd35c"/><stop offset=".5" stop-color="#ff9f1a"/><stop offset="1" stop-color="#b85a00"/>
    </linearGradient>
    <linearGradient id="ic-glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="#fff" stop-opacity=".08"/>
      <stop offset=".8" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/>
    </linearGradient>
    <radialGradient id="ic-dial" cx=".4" cy=".35" r=".75">
      <stop offset="0" stop-color="#3b2a8c"/><stop offset=".55" stop-color="#1a1150"/><stop offset="1" stop-color="#07051a"/>
    </radialGradient>
    <radialGradient id="ic-eye" cx=".5" cy=".4" r=".7">
      <stop offset="0" stop-color="#f3d7ff"/><stop offset=".55" stop-color="#a86bd6"/><stop offset="1" stop-color="#2a0b3a"/>
    </radialGradient>
    <linearGradient id="ic-mask" x1=".2" y1="0" x2=".85" y2="1">
      <stop offset="0" stop-color="#fff0b0"/><stop offset=".3" stop-color="#e8b429"/>
      <stop offset=".62" stop-color="#b9820d"/><stop offset="1" stop-color="#6d4a05"/>
    </linearGradient>
    <linearGradient id="ic-card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9e3f5"/>
    </linearGradient>
  </defs>
</svg>`;

export function injectIconDefs() {
  document.body.insertAdjacentHTML('afterbegin', ICON_DEFS);
}

/** Königskette: Panzerglieder entlang einer U-Kurve + Kronen-Anhänger */
function chainLinks(): string {
  const pts: string[] = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // Quadratische Bézierkurve (14,14) → (50,86) → (86,14)
    const x = (1 - t) ** 2 * 14 + 2 * (1 - t) * t * 50 + t ** 2 * 86;
    const y = (1 - t) ** 2 * 12 + 2 * (1 - t) * t * 84 + t ** 2 * 12;
    const dx = 2 * (1 - t) * (50 - 14) + 2 * t * (86 - 50);
    const dy = 2 * (1 - t) * (84 - 12) + 2 * t * (12 - 84);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const flat = i % 2 === 0;
    pts.push(
      `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(1)})">
        <ellipse rx="${flat ? 6.2 : 5.6}" ry="${flat ? 4.2 : 2.6}" fill="url(#ic-gold-h)" stroke="#6b4300" stroke-width="1"/>
        <ellipse rx="${flat ? 2.6 : 3}" ry="${flat ? 1.4 : 0.8}" fill="#5a3a00"/>
      </g>`,
    );
  }
  return pts.join('');
}

const ICONS: Partial<Record<SymbolId, string>> = {
  wild: `
    <!-- Armband (Oyster-Glieder) -->
    <path d="M34 4 H66 L63 28 H37 Z" fill="url(#ic-steel)" stroke="#12141c" stroke-width="1.5"/>
    <path d="M37 72 H63 L66 96 H34 Z" fill="url(#ic-steel)" stroke="#12141c" stroke-width="1.5"/>
    <path d="M44 4 V28 M56 4 V28 M44 72 V96 M56 72 V96" stroke="#12141c" stroke-width="1.2"/>
    <path d="M34.5 10 H65.5 M35 17 H65 M35.5 23 H64.5 M36 78 H64 M35.5 84 H64.5 M35 90 H65" stroke="#12141c" stroke-width=".8" opacity=".7"/>
    <rect x="45" y="5" width="10" height="22" fill="#fff" opacity=".35"/>
    <rect x="45" y="73" width="10" height="22" fill="#fff" opacity=".35"/>
    <!-- Krone -->
    <rect x="75" y="45" width="7" height="10" rx="2" fill="url(#ic-chrome)" stroke="#12141c" stroke-width="1.2"/>
    <!-- Gehäuse & geriffelte Lünette -->
    <circle cx="50" cy="50" r="28.5" fill="url(#ic-chrome)" stroke="#12141c" stroke-width="2"/>
    <circle cx="50" cy="50" r="26" fill="url(#ic-steel)"/>
    <g stroke="#2c3040" stroke-width="1.1"><line x1="72.5" y1="50.0" x2="76.0" y2="50.0"/><line x1="72.3" y1="52.9" x2="75.8" y2="53.4"/><line x1="71.7" y1="55.8" x2="75.1" y2="56.7"/><line x1="70.8" y1="58.6" x2="74.0" y2="59.9"/><line x1="69.5" y1="61.2" x2="72.5" y2="63.0"/><line x1="67.9" y1="63.7" x2="70.6" y2="65.8"/><line x1="65.9" y1="65.9" x2="68.4" y2="68.4"/><line x1="63.7" y1="67.9" x2="65.8" y2="70.6"/><line x1="61.2" y1="69.5" x2="63.0" y2="72.5"/><line x1="58.6" y1="70.8" x2="59.9" y2="74.0"/><line x1="55.8" y1="71.7" x2="56.7" y2="75.1"/><line x1="52.9" y1="72.3" x2="53.4" y2="75.8"/><line x1="50.0" y1="72.5" x2="50.0" y2="76.0"/><line x1="47.1" y1="72.3" x2="46.6" y2="75.8"/><line x1="44.2" y1="71.7" x2="43.3" y2="75.1"/><line x1="41.4" y1="70.8" x2="40.1" y2="74.0"/><line x1="38.8" y1="69.5" x2="37.0" y2="72.5"/><line x1="36.3" y1="67.9" x2="34.2" y2="70.6"/><line x1="34.1" y1="65.9" x2="31.6" y2="68.4"/><line x1="32.1" y1="63.7" x2="29.4" y2="65.8"/><line x1="30.5" y1="61.2" x2="27.5" y2="63.0"/><line x1="29.2" y1="58.6" x2="26.0" y2="59.9"/><line x1="28.3" y1="55.8" x2="24.9" y2="56.7"/><line x1="27.7" y1="52.9" x2="24.2" y2="53.4"/><line x1="27.5" y1="50.0" x2="24.0" y2="50.0"/><line x1="27.7" y1="47.1" x2="24.2" y2="46.6"/><line x1="28.3" y1="44.2" x2="24.9" y2="43.3"/><line x1="29.2" y1="41.4" x2="26.0" y2="40.1"/><line x1="30.5" y1="38.8" x2="27.5" y2="37.0"/><line x1="32.1" y1="36.3" x2="29.4" y2="34.2"/><line x1="34.1" y1="34.1" x2="31.6" y2="31.6"/><line x1="36.3" y1="32.1" x2="34.2" y2="29.4"/><line x1="38.7" y1="30.5" x2="37.0" y2="27.5"/><line x1="41.4" y1="29.2" x2="40.1" y2="26.0"/><line x1="44.2" y1="28.3" x2="43.3" y2="24.9"/><line x1="47.1" y1="27.7" x2="46.6" y2="24.2"/><line x1="50.0" y1="27.5" x2="50.0" y2="24.0"/><line x1="52.9" y1="27.7" x2="53.4" y2="24.2"/><line x1="55.8" y1="28.3" x2="56.7" y2="24.9"/><line x1="58.6" y1="29.2" x2="59.9" y2="26.0"/><line x1="61.2" y1="30.5" x2="63.0" y2="27.5"/><line x1="63.7" y1="32.1" x2="65.8" y2="29.4"/><line x1="65.9" y1="34.1" x2="68.4" y2="31.6"/><line x1="67.9" y1="36.3" x2="70.6" y2="34.2"/><line x1="69.5" y1="38.7" x2="72.5" y2="37.0"/><line x1="70.8" y1="41.4" x2="74.0" y2="40.1"/><line x1="71.7" y1="44.2" x2="75.1" y2="43.3"/><line x1="72.3" y1="47.1" x2="75.8" y2="46.6"/></g>
    <!-- Zifferblatt -->
    <circle cx="50" cy="50" r="21.5" fill="url(#ic-dial)" stroke="#12141c" stroke-width="1.5"/>
    <rect x="-1.8" y="-18.5" width="3.6" height="6" rx="1" fill="url(#ic-chrome)" transform="translate(50 50) rotate(0)"/><circle cx="57.8" cy="36.6" r="1.5" fill="#e3e7ef"/><circle cx="63.4" cy="42.2" r="1.5" fill="#e3e7ef"/><rect x="-1.8" y="-18.5" width="3.6" height="6" rx="1" fill="url(#ic-chrome)" transform="translate(50 50) rotate(90)"/><circle cx="63.4" cy="57.8" r="1.5" fill="#e3e7ef"/><circle cx="57.8" cy="63.4" r="1.5" fill="#e3e7ef"/><rect x="-1.8" y="-18.5" width="3.6" height="6" rx="1" fill="url(#ic-chrome)" transform="translate(50 50) rotate(180)"/><circle cx="42.2" cy="63.4" r="1.5" fill="#e3e7ef"/><circle cx="36.6" cy="57.8" r="1.5" fill="#e3e7ef"/><rect x="-1.8" y="-18.5" width="3.6" height="6" rx="1" fill="url(#ic-chrome)" transform="translate(50 50) rotate(270)"/><circle cx="36.6" cy="42.2" r="1.5" fill="#e3e7ef"/><circle cx="42.2" cy="36.6" r="1.5" fill="#e3e7ef"/>
    <rect x="61" y="47.5" width="6" height="5" rx="1" fill="#fff" stroke="#6d7488" stroke-width=".6"/>
    <text x="64" y="51.6" text-anchor="middle" font-family="Inter, sans-serif" font-size="4" font-weight="700" fill="#12061f">22</text>
    <text x="50" y="41" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="4.6" letter-spacing=".4" fill="#e3e7ef">SUSAK</text>
    <!-- Zeiger -->
    <path d="M50 50 L 43 38" stroke="#e3e7ef" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M50 50 L 61 36" stroke="#e3e7ef" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M50 56 L 50 33" stroke="#ff2e88" stroke-width=".9" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="2" fill="url(#ic-chrome)" stroke="#12141c" stroke-width=".6"/>
    <!-- Glas-Reflex -->
    <path d="M33 42 A 18 18 0 0 1 48 30" stroke="#fff" stroke-width="2.4" fill="none" opacity=".45" stroke-linecap="round"/>`,

  vape: `
    <g opacity=".85">
      <circle cx="30" cy="22" r="9" fill="#ff7ab8" opacity=".35"/>
      <circle cx="20" cy="14" r="7" fill="#b388ff" opacity=".35"/>
      <circle cx="38" cy="12" r="6" fill="#00e5ff" opacity=".3"/>
      <path d="M40 26 C 30 28, 22 22, 26 14 C 28 8, 36 6, 40 10" fill="none" stroke="#ff7ab8" stroke-width="3" stroke-linecap="round"/>
      <path d="M26 20 C 16 20, 10 12, 16 6" fill="none" stroke="#00e5ff" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    <g transform="translate(-9 -8) scale(1.16) rotate(-18 52 58)">
      <rect x="44" y="18" width="16" height="16" rx="4" fill="#1b1830" stroke="#00e5ff" stroke-width="2"/>
      <rect x="38" y="30" width="28" height="60" rx="8" fill="url(#ic-vape)" stroke="#0b0716" stroke-width="2"/>
      <rect x="43" y="42" width="18" height="12" rx="2.5" fill="#07040e" stroke="#00e5ff" stroke-width="1.5"/>
      <rect x="46" y="46" width="9" height="4" rx="1" fill="#00e5ff"/>
      <circle cx="52" cy="68" r="5" fill="#0b0716" stroke="#fff" stroke-width="2"/>
      <rect x="41" y="34" width="4" height="50" rx="2" fill="#fff" opacity=".35"/>
    </g>`,

  hammer: `
    <g transform="rotate(-38 50 52)">
      <rect x="45" y="34" width="10" height="60" rx="4" fill="url(#ic-wood)" stroke="#2a1405" stroke-width="1.5"/>
      <rect x="44" y="76" width="12" height="18" rx="4" fill="#1a1a24" stroke="#b388ff" stroke-width="1.5"/>
      <rect x="20" y="8" width="60" height="32" rx="5" fill="url(#ic-steel)" stroke="#12141c" stroke-width="2"/>
      <rect x="14" y="11" width="9" height="26" rx="2.5" fill="#aab3c5" stroke="#12141c" stroke-width="1.5"/>
      <rect x="77" y="11" width="9" height="26" rx="2.5" fill="#aab3c5" stroke="#12141c" stroke-width="1.5"/>
      <rect x="24" y="11" width="52" height="6" rx="2" fill="#fff" opacity=".55"/>
      <rect x="42" y="36" width="16" height="6" rx="2" fill="#2c3040"/>
    </g>`,

  gloves: `
    <g transform="translate(14 6) rotate(-12 30 50) scale(.9)" opacity=".85">
      <path d="M14 56 C 6 36, 16 14, 38 12 C 60 10, 70 26, 66 46 C 64 58, 58 64, 50 66 L 50 76 L 20 76 L 20 66 C 17 63, 15 60, 14 56 Z" fill="url(#ic-glove)" stroke="#4d0010" stroke-width="2"/>
      <rect x="18" y="72" width="34" height="16" rx="4" fill="#f4f1ff" stroke="#4d0010" stroke-width="2"/>
    </g>
    <g transform="translate(30 10) rotate(10 30 50)">
      <path d="M14 56 C 6 36, 16 14, 38 12 C 60 10, 70 26, 66 46 C 64 58, 58 64, 50 66 L 50 76 L 20 76 L 20 66 C 17 63, 15 60, 14 56 Z" fill="url(#ic-glove)" stroke="#4d0010" stroke-width="2"/>
      <path d="M14 50 C 6 48, 4 60, 12 64 C 20 68, 28 62, 26 54" fill="url(#ic-glove)" stroke="#4d0010" stroke-width="2"/>
      <ellipse cx="32" cy="26" rx="12" ry="6" fill="#fff" opacity=".35" transform="rotate(-20 32 26)"/>
      <rect x="18" y="72" width="34" height="16" rx="4" fill="#f4f1ff" stroke="#4d0010" stroke-width="2"/>
      <rect x="18" y="78" width="34" height="4" fill="#ff1f4b"/>
      <path d="M28 72 L 42 88 M 42 72 L 28 88" stroke="#4d0010" stroke-width="1.5"/>
    </g>`,

  honey: `
    <rect x="26" y="12" width="48" height="14" rx="4" fill="url(#ic-gold)" stroke="#5a3a00" stroke-width="2"/>
    <path d="M24 24 H76 L 76 28 H 24 Z" fill="#7a4b00"/>
    <path d="M28 28 H72 C 82 32, 84 42, 84 52 V 78 C 84 88, 76 92, 66 92 H34 C 24 92, 16 88, 16 78 V 52 C 16 42, 18 32, 28 28 Z" fill="url(#ic-honey)" stroke="#5a2e00" stroke-width="2"/>
    <path d="M28 28 H72 C 82 32, 84 42, 84 52 V 78 C 84 88, 76 92, 66 92 H34 C 24 92, 16 88, 16 78 V 52 C 16 42, 18 32, 28 28 Z" fill="url(#ic-glass)"/>
    <path d="M32 26 C 32 36, 37 38, 37 46 C 37 51, 31 51, 31 46 C 31 40, 28 36, 28 28 Z" fill="#ffb830" stroke="#8a4a00" stroke-width="1"/>
    <path d="M60 26 C 60 32, 63 34, 63 39 C 63 42, 59 42, 59 39 C 59 35, 57 32, 57 28 Z" fill="#ffb830" stroke="#8a4a00" stroke-width="1"/>
    <polygon points="50,48 66,57 66,75 50,84 34,75 34,57" fill="#fff3d0" stroke="#7a4b00" stroke-width="2"/>
    <ellipse cx="50" cy="61" rx="5" ry="3.8" fill="#ffc21a" stroke="#3a2400" stroke-width="1.3"/>
    <path d="M46.5 59 V 63 M 50 57.8 V 64.2 M 53.5 59 V 63" stroke="#3a2400" stroke-width="1.3"/>
    <ellipse cx="46" cy="56" rx="3.4" ry="2.1" fill="#fff" opacity=".85" transform="rotate(-30 46 56)"/>
    <ellipse cx="54" cy="56" rx="3.4" ry="2.1" fill="#fff" opacity=".85" transform="rotate(30 54 56)"/>
    <text x="50" y="76" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="11" letter-spacing=".3" fill="#7a4b00">MACUN</text>`,

  chain: `
    ${chainLinks()}
    <path d="M34 64 L 38 86 H 62 L 66 64 L 58 73 L 50 58 L 42 73 Z" fill="url(#ic-gold)" stroke="#6b4300" stroke-width="2" stroke-linejoin="round"/>
    <rect x="37" y="84" width="26" height="6" rx="2" fill="url(#ic-gold)" stroke="#6b4300" stroke-width="1.5"/>
    <circle cx="34" cy="63" r="3" fill="#fff6c4" stroke="#6b4300"/>
    <circle cx="50" cy="57" r="3.2" fill="#fff6c4" stroke="#6b4300"/>
    <circle cx="66" cy="63" r="3" fill="#fff6c4" stroke="#6b4300"/>
    <circle cx="50" cy="78" r="3.4" fill="#ff2e88" stroke="#6b0033"/>
    <circle cx="42" cy="79" r="2.2" fill="#00e5ff"/>
    <circle cx="58" cy="79" r="2.2" fill="#00e5ff"/>`,

  audi: `
    <g fill="none" stroke-width="10" stroke="#ff2e88" opacity=".35">
      <circle cx="20.5" cy="50" r="15.5"/><circle cx="40.2" cy="50" r="15.5"/>
      <circle cx="59.8" cy="50" r="15.5"/><circle cx="79.5" cy="50" r="15.5"/>
    </g>
    <g fill="none" stroke-width="8" stroke="#12121a">
      <circle cx="20.5" cy="50" r="15.5"/><circle cx="40.2" cy="50" r="15.5"/>
      <circle cx="59.8" cy="50" r="15.5"/><circle cx="79.5" cy="50" r="15.5"/>
    </g>
    <g fill="none" stroke="url(#ic-chrome)" stroke-width="6">
      <circle cx="20.5" cy="50" r="15.5"/><circle cx="40.2" cy="50" r="15.5"/>
      <circle cx="59.8" cy="50" r="15.5"/><circle cx="79.5" cy="50" r="15.5"/>
    </g>
    <g fill="none" stroke="#fff" stroke-width="1.4" opacity=".85" stroke-linecap="round">
      <path d="M9.5 43 A 13 13 0 0 1 20.5 36.5"/><path d="M29.2 43 A 13 13 0 0 1 40.2 36.5"/>
      <path d="M48.8 43 A 13 13 0 0 1 59.8 36.5"/><path d="M68.5 43 A 13 13 0 0 1 79.5 36.5"/>
    </g>`,

  scatter: `
    <!-- Helmschale mit Schläfenspitzen und zwei Zähnen -->
    <path d="M50 3 C 68 3, 81 13, 85 27 C 88 38, 88 46, 86 53 L 97 59 L 88 66
             C 86 76, 81 83, 75 87 L 73 99 L 64 77 C 59 80, 55 81, 50 82
             C 45 81, 41 80, 36 77 L 27 99 L 25 87 C 19 83, 14 76, 12 66
             L 3 59 L 14 53 C 12 46, 12 38, 15 27 C 19 13, 32 3, 50 3 Z"
      fill="url(#ic-mask)" stroke="#5a3a00" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- Brauenbögen zu den Schläfen -->
    <path d="M50 22 C 63 25, 75 32, 84 42 M50 22 C 37 25, 25 32, 16 42" fill="none" stroke="#7a5200" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M50 30 C 61 33, 71 39, 79 47 M50 30 C 39 33, 29 39, 21 47" fill="none" stroke="#7a5200" stroke-width="1.8" opacity=".75" stroke-linecap="round"/>
    <path d="M50 16 C 62 18, 73 24, 81 32" fill="none" stroke="#fff3c9" stroke-width="2" opacity=".45" stroke-linecap="round"/>
    <!-- Mittelgrat -->
    <path d="M50 8 L 50 60" stroke="#7a5200" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M50 12 L 55 30 L 50 58 L 45 30 Z" fill="#d9a318" stroke="#7a5200" stroke-width="1.4"/>
    <!-- Augenschlitze -->
    <path d="M57 44 L 83 39 C 83 48, 81 54, 77 57 L 60 52 Z"
      fill="url(#ic-eye)" stroke="#4a2f00" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M43 44 L 17 39 C 17 48, 19 54, 23 57 L 40 52 Z"
      fill="url(#ic-eye)" stroke="#4a2f00" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M63 45.5 L 80 42 M37 45.5 L 20 42" stroke="#fff" stroke-width="1.7" opacity=".5" stroke-linecap="round"/>
    <!-- Nase & Wangenkanten -->
    <path d="M50 58 C 46 62, 44 68, 44 73 M50 58 C 54 62, 56 68, 56 73" fill="none" stroke="#7a5200" stroke-width="2" stroke-linecap="round"/>
    <path d="M78 58 C 78 68, 76 78, 73 86 M22 58 C 22 68, 24 78, 27 86" fill="none" stroke="#7a5200" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M14 55 C 13 62, 13 66, 14 68 M86 55 C 87 62, 87 66, 86 68" fill="none" stroke="#fff3c9" stroke-width="1.6" opacity=".4" stroke-linecap="round"/>
    <!-- Glanzlichter -->
    <path d="M24 18 C 31 11, 40 7, 48 6" fill="none" stroke="#fff6c4" stroke-width="3" opacity=".55" stroke-linecap="round"/>
    <path d="M30 86 L 28 95" stroke="#fff6c4" stroke-width="1.8" opacity=".4" stroke-linecap="round"/>`,

  ace: `
    <g transform="rotate(-10 50 50)">
      <rect x="22" y="10" width="56" height="80" rx="7" fill="url(#ic-card)" stroke="#ff5a5a" stroke-width="2.5"/>
      <rect x="26" y="14" width="48" height="72" rx="5" fill="none" stroke="#ffd84d" stroke-width="1" opacity=".8"/>
      <text x="30" y="31" font-family="Anton, Impact, sans-serif" font-size="17" fill="#12061f">A</text>
      <text transform="translate(70 71) rotate(180)" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="17" fill="#12061f">A</text>
      <path d="M50 30 C 50 30, 32 44, 32 54 C 32 62, 40 66, 47 60 C 46 66, 44 70, 40 72 H 60 C 56 70, 54 66, 53 60 C 60 66, 68 62, 68 54 C 68 44, 50 30, 50 30 Z" fill="#12061f"/>
      <path d="M44 44 C 42 47, 40 50, 40 53" stroke="#ff2e88" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>`,
};

export function iconSvg(id: SymbolId): string | null {
  const body = ICONS[id];
  return body ? `<svg class="sym__icon" viewBox="0 0 100 100" aria-hidden="true">${body}</svg>` : null;
}
