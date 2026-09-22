import { sfx } from '../audio/sfx';
import { BONUS_GAMES, type BonusGame, type Wallet } from '../bonus';
import { BIG_WIN_TIERS, PAYLINES, PAYLINE_COLORS, PAYTABLE, REELS, ROWS, SCATTER_PAYS } from '../config/game';
import { PAYING_SYMBOLS, SYMBOLS } from '../config/symbols';
import type { BonusId, SpinResult } from '../engine/slot';
import { fmt } from './format';
import type { Particles } from './particles';
import { wait } from './reels';
import { renderSymbol } from './symbolArt';
import bossUrl from '../assets/scene/boss.webp';
import donUrl from '../assets/crew/don.webp';
import playboyUrl from '../assets/crew/playboy.webp';

function overlay(cls: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `overlay ${cls}`;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('is-open'));
  return el;
}

async function closeOverlay(el: HTMLElement) {
  el.classList.remove('is-open');
  el.classList.add('is-closing');
  await wait(350);
  el.remove();
}

export function bigWinTier(win: number, bet: number): number {
  let tier = -1;
  BIG_WIN_TIERS.forEach((t, i) => {
    if (win >= bet * t.min) tier = i;
  });
  return tier;
}

/** Big/Mega/Epic-Win mit hochzählender Summe. Klick/Leertaste überspringt. */
export function showBigWin(win: number, bet: number, particles: Particles): Promise<void> {
  const finalTier = bigWinTier(win, bet);
  const el = overlay('bigwin');
  el.innerHTML = `
    <div class="bigwin__rays"></div>
    <div class="bigwin__content">
      <div class="bigwin__tier" data-tier="0">${BIG_WIN_TIERS[0].name}</div>
      <div class="bigwin__amount">$0</div>
      <div class="bigwin__hint">Tippen zum Überspringen</div>
    </div>`;
  const tierEl = el.querySelector<HTMLElement>('.bigwin__tier')!;
  const amountEl = el.querySelector<HTMLElement>('.bigwin__amount')!;
  const duration = 2800 + finalTier * 2000;
  particles.startFountain(1 + finalTier * 0.6);
  sfx.bigWin();

  return new Promise((resolve) => {
    let shown = 0;
    let finished = false;
    let tier = 0;
    const t0 = performance.now();
    let lastTick = 0;

    const setTier = (i: number) => {
      if (i === tier) return;
      tier = i;
      tierEl.textContent = BIG_WIN_TIERS[i].name;
      tierEl.dataset.tier = String(i);
      tierEl.classList.remove('pop');
      void tierEl.offsetWidth;
      tierEl.classList.add('pop');
      sfx.tierUp();
      particles.burst(innerWidth / 2, innerHeight / 2, 90);
    };

    const frame = (now: number) => {
      if (finished) return;
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 2.2);
      shown = win * eased;
      amountEl.textContent = fmt(shown);
      setTier(Math.max(0, bigWinTier(shown, bet)));
      if (now - lastTick > 70 && p < 1) {
        sfx.countTick();
        lastTick = now;
      }
      if (p < 1) requestAnimationFrame(frame);
      else complete();
    };

    const complete = () => {
      if (finished) return;
      finished = true;
      amountEl.textContent = fmt(win);
      setTier(finalTier);
      amountEl.classList.add('final');
      setTimeout(close, 1800);
    };

    let closed = false;
    const close = async () => {
      if (closed) return;
      closed = true;
      removeEventListener('keydown', onKey);
      particles.stopFountain();
      await closeOverlay(el);
      resolve();
    };

    const skip = () => (finished ? close() : complete());
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        skip();
      }
    };
    el.addEventListener('pointerdown', skip);
    addEventListener('keydown', onKey);
    requestAnimationFrame(frame);
  });
}

/** Trigger-Intro + Bonusspiel ausführen. Liefert den Bonusgewinn. */
export async function runBonus(id: BonusId, trigger: SpinResult, particles: Particles, wallet: Wallet): Promise<number> {
  const game: BonusGame = BONUS_GAMES[id];
  const el = overlay(`bonus bonus--${game.theme}`);
  const icons = id === 'coup' ? ['ace', 'don', 'playboy'] : ['scatter', 'scatter', 'scatter'];
  el.innerHTML = `
    <div class="bonus__lights"></div>
    <div class="bonus__intro">
      <div class="bonus__crew">
        <img class="bonus__person bonus__person--left" src="${donUrl}" alt="" />
        <img class="bonus__person bonus__person--center" src="${bossUrl}" alt="" />
        <img class="bonus__person bonus__person--right" src="${playboyUrl}" alt="" />
      </div>
      <p class="bonus__eyebrow">Bonus ausgelöst</p>
      <h2 class="bonus__title">${game.title}</h2>
      <div class="bonus__icons"></div>
      <p class="bonus__tagline">${game.tagline}</p>
      <button class="btn-primary" data-start>Bonus starten</button>
    </div>
    <div class="bonus__stage" hidden></div>`;
  const iconBox = el.querySelector('.bonus__icons')!;
  icons.forEach((s, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'bonus__icon';
    wrap.style.animationDelay = `${0.25 + i * 0.15}s`;
    wrap.append(renderSymbol(s as never));
    iconBox.append(wrap);
  });

  if (game.theme === 'gold') sfx.gong();
  else sfx.heistStinger();
  particles.burst(innerWidth / 2, innerHeight * 0.4, 120);

  await new Promise<void>((r) => el.querySelector('[data-start]')!.addEventListener('click', () => r(), { once: true }));
  sfx.uiClick();
  el.querySelector<HTMLElement>('.bonus__intro')!.hidden = true;
  const stage = el.querySelector<HTMLElement>('.bonus__stage')!;
  stage.hidden = false;
  const win = await game.play({ bet: trigger.bet, trigger, stage, wallet });
  await closeOverlay(el);
  return win;
}

/** Gewinntabelle & Regeln */
export function openPaytable(bet: number) {
  const lineBet = bet / PAYLINES.length;
  const el = overlay('paytable');
  const symbolRows = [...PAYING_SYMBOLS]
    .reverse()
    .map((id) => {
      const p = PAYTABLE[id]!;
      return `
        <div class="pt-symbol">
          <div class="pt-symbol__art" data-sym="${id}"></div>
          <div class="pt-symbol__info">
            <span class="pt-symbol__name">${SYMBOLS[id].name}</span>
            <dl class="pt-pays">
              <div><dt>5×</dt><dd>${fmt(p[5] * lineBet)}</dd></div>
              <div><dt>4×</dt><dd>${fmt(p[4] * lineBet)}</dd></div>
              <div><dt>3×</dt><dd>${fmt(p[3] * lineBet)}</dd></div>
            </dl>
          </div>
        </div>`;
    })
    .join('');

  const lines = PAYLINES.map((rows, i) => {
    const cells = Array.from({ length: ROWS * REELS }, (_, k) => {
      const row = Math.floor(k / REELS);
      const reel = k % REELS;
      return `<i class="${rows[reel] === row ? 'on' : ''}"></i>`;
    }).join('');
    return `<div class="pt-line" style="--line-color:${PAYLINE_COLORS[i]}"><div class="pt-line__grid">${cells}</div><span>Linie ${i + 1}</span></div>`;
  }).join('');

  el.innerHTML = `
    <div class="panel">
      <header class="panel__head">
        <h2>Gewinntabelle</h2>
        <span class="panel__bet">Einsatz ${fmt(bet)}</span>
        <button class="icon-btn" data-close aria-label="Schließen">✕</button>
      </header>
      <div class="panel__body">
        <section>
          <h3>Symbole</h3>
          <div class="pt-symbols">${symbolRows}</div>
        </section>
        <section>
          <h3>Spezialsymbole</h3>
          <div class="pt-specials">
            <div class="pt-special">
              <div class="pt-symbol__art" data-sym="wild"></div>
              <div><strong>Expanding Wild</strong><p>Erscheint auf Walze 2, 3 und 4 und ersetzt alle normalen Symbole. Trägt es zu einem Gewinn bei, dehnt es sich über die gesamte Walze aus.</p></div>
            </div>
            <div class="pt-special">
              <div class="pt-symbol__art" data-sym="scatter"></div>
              <div><strong>Scatter – Goldmaske</strong><p>Zahlt überall: 3× = ${fmt(SCATTER_PAYS[3] * bet)}, 4× = ${fmt(SCATTER_PAYS[4] * bet)}, 5× = ${fmt(SCATTER_PAYS[5] * bet)}. Ab 3 Goldmasken startet der <b>GOLDEN-MASK-Bonus</b>: eine Runde <b>Pick-Up</b> – 5 Walzen mit je einem Symbol, max. 2 Spins pro Zug, dann ein passendes Feld einlösen (z. B. 3× Symbol, Full House, 4 Gleiche, 5 Gleiche = 50 Punkte). Passt nichts mehr, endet die Runde. Gewinn = Punkte × Einsatz.</p></div>
            </div>
            <div class="pt-special">
              <div class="pt-heist">
                <div class="pt-symbol__art" data-sym="ace"></div>
                <div class="pt-symbol__art" data-sym="don"></div>
                <div class="pt-symbol__art" data-sym="playboy"></div>
              </div>
              <div><strong>Coup-Crew</strong><p>Sind das Ass und beide Crew-Mitglieder gleichzeitig irgendwo sichtbar, startet der <b>COUP-Bonus</b>: echtes Blackjack gegen den Dealer (Vegas-Regeln) mit deinem Bankguthaben.</p></div>
            </div>
          </div>
        </section>
        <section>
          <h3>Gewinnlinien</h3>
          <div class="pt-lines">${lines}</div>
        </section>
        <section class="pt-rules">
          <h3>Regeln</h3>
          <ul>
            <li>Liniengewinne zählen von links nach rechts ab Walze 1, mindestens 3 gleiche Symbole.</li>
            <li>Pro Linie wird nur der höchste Gewinn gezahlt. Gewinne verschiedener Linien werden addiert.</li>
            <li>Der Einsatz wird gleichmäßig auf 5 Linien verteilt.</li>
            <li>Leertaste: Drehen / Stoppen · Turbo verkürzt die Spin-Dauer.</li>
            <li>Nur Spielgeld – keine echten Gewinne.</li>
          </ul>
        </section>
      </div>
    </div>`;

  el.querySelectorAll<HTMLElement>('[data-sym]').forEach((n) => n.append(renderSymbol(n.dataset.sym as never)));
  const close = () => {
    removeEventListener('keydown', onKey);
    void closeOverlay(el);
  };
  const onKey = (e: KeyboardEvent) => e.code === 'Escape' && close();
  addEventListener('keydown', onKey);
  el.querySelector('[data-close]')!.addEventListener('click', close);
  el.addEventListener('pointerdown', (e) => e.target === el && close());
}
