import { sfx } from './audio/sfx';
import { BET_LEVELS, DEFAULT_BET_INDEX, PAYLINES, PAYLINE_COLORS, REELS, START_BALANCE } from './config/game';
import { HEIST_SYMBOLS, type SymbolId } from './config/symbols';
import { cryptoRng, randInt } from './engine/rng';
import { evaluate, gridFromStops, spin, type Grid, type SpinResult } from './engine/slot';
import { REEL_STRIPS } from './engine/strips';
import { fmt } from './ui/format';
import { bigWinTier, openPaytable, runBonus, showBigWin } from './ui/overlays';
import { Particles } from './ui/particles';
import { ReelsView, wait } from './ui/reels';
import { WinPresenter } from './ui/winPresenter';

/** Test-Raster für den Dev-Modus (grid[walze][reihe]) */
const DEBUG_GRIDS: Record<'bigwin' | 'wild' | 'golden' | 'coup', SymbolId[][]> = {
  bigwin: [
    ['gloves', 'audi', 'audi', 'audi', 'vape'],
    ['honey', 'audi', 'audi', 'audi', 'gloves'],
    ['vape', 'audi', 'audi', 'audi', 'hammer'],
    ['chain', 'audi', 'audi', 'audi', 'honey'],
    ['gloves', 'audi', 'vape', 'hammer', 'chain'],
  ],
  wild: [
    ['gloves', 'honey', 'chain', 'vape', 'hammer'],
    ['wild', 'gloves', 'vape', 'hammer', 'honey'],
    ['honey', 'chain', 'chain', 'gloves', 'vape'],
    ['hammer', 'vape', 'gloves', 'wild', 'gloves'],
    ['vape', 'gloves', 'chain', 'hammer', 'honey'],
  ],
  golden: [
    ['gloves', 'scatter', 'chain', 'vape', 'hammer'],
    ['honey', 'gloves', 'vape', 'hammer', 'honey'],
    ['honey', 'chain', 'hammer', 'scatter', 'vape'],
    ['hammer', 'vape', 'gloves', 'audi', 'gloves'],
    ['vape', 'gloves', 'scatter', 'hammer', 'honey'],
  ],
  coup: [
    ['gloves', 'honey', 'ace', 'vape', 'hammer'],
    ['honey', 'gloves', 'vape', 'don', 'honey'],
    ['honey', 'chain', 'hammer', 'gloves', 'vape'],
    ['hammer', 'vape', 'gloves', 'audi', 'gloves'],
    ['playboy', 'gloves', 'chain', 'hammer', 'honey'],
  ],
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(`susak.${k}`);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(`susak.${k}`, v);
    } catch {
      /* ignore */
    }
  },
};

export class Game {
  private rng = cryptoRng();
  private reels: ReelsView;
  private presenter: WinPresenter;
  private particles = new Particles($<HTMLCanvasElement>('fx'));

  private balance = Number(store.get('balance') ?? START_BALANCE);
  private betIndex = Number(store.get('bet') ?? DEFAULT_BET_INDEX);
  private turbo = store.get('turbo') === '1';
  private busy = false;
  private autoLeft = 0;
  private winCounter = 0;

  private ui = {
    grid: $('grid'),
    balance: $('balance'),
    bet: $('bet'),
    win: $('win'),
    spin: $<HTMLButtonElement>('btn-spin'),
    betUp: $<HTMLButtonElement>('bet-up'),
    betDown: $<HTMLButtonElement>('bet-down'),
    turbo: $<HTMLButtonElement>('btn-turbo'),
    sound: $<HTMLButtonElement>('btn-sound'),
    info: $<HTMLButtonElement>('btn-info'),
    auto: $<HTMLButtonElement>('btn-auto'),
    autoMenu: $('auto-menu'),
    autoCount: $('auto-count'),
    ticker: $('ticker'),
  };

  constructor() {
    if (!Number.isFinite(this.balance) || this.balance < 0) this.balance = START_BALANCE;
    if (!(this.betIndex in BET_LEVELS)) this.betIndex = DEFAULT_BET_INDEX;

    const initial = gridFromStops(REEL_STRIPS.map((s) => randInt(this.rng, s.length)));
    this.reels = new ReelsView(this.ui.grid, initial);
    this.presenter = new WinPresenter(this.ui.grid, this.reels);
    this.buildMarkers();
    this.bindControls();
    this.render();

    if (import.meta.env.DEV) {
      // Debug im Browser: susak.force('bigwin' | 'wild' | 'golden' | 'coup'), danach Spin drücken
      (window as unknown as { susak: unknown }).susak = {
        force: (preset: keyof typeof DEBUG_GRIDS) => {
          this.forcedGrid = DEBUG_GRIDS[preset].map((col) => [...col]);
        },
        balance: (n: number) => {
          this.balance = n;
          this.saveBalance();
          this.render();
        },
      };
    }
  }

  private forcedGrid: Grid | null = null;

  private get bet() {
    return BET_LEVELS[this.betIndex];
  }

  // ───────────────────────── UI ─────────────────────────

  private buildMarkers() {
    for (const side of ['left', 'right'] as const) {
      const box = $(`markers-${side}`);
      const reel = side === 'left' ? 0 : REELS - 1;
      for (let row = 0; row < 5; row++) {
        const line = PAYLINES.findIndex((l) => l[reel] === row);
        const m = document.createElement('button');
        m.className = 'marker';
        m.innerHTML = `<span>${line + 1}</span>`;
        m.style.setProperty('--line-color', PAYLINE_COLORS[line]);
        m.setAttribute('aria-label', `Gewinnlinie ${line + 1}`);
        m.addEventListener('pointerenter', () => !this.busy && this.presenter.preview(line));
        m.addEventListener('pointerleave', () => this.presenter.preview(null));
        box.append(m);
      }
    }
  }

  private bindControls() {
    const unlock = () => sfx.unlock();
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);

    this.ui.spin.addEventListener('click', () => this.onSpinButton());
    this.ui.betUp.addEventListener('click', () => this.changeBet(1));
    this.ui.betDown.addEventListener('click', () => this.changeBet(-1));

    this.ui.turbo.addEventListener('click', () => {
      this.turbo = !this.turbo;
      store.set('turbo', this.turbo ? '1' : '0');
      sfx.uiClick();
      this.render();
    });

    this.ui.sound.addEventListener('click', () => {
      sfx.setMuted(!sfx.muted);
      sfx.uiClick();
      this.render();
    });

    this.ui.info.addEventListener('click', () => {
      sfx.uiClick();
      openPaytable(this.bet);
    });

    this.ui.auto.addEventListener('click', (e) => {
      e.stopPropagation();
      sfx.uiClick();
      if (this.autoLeft > 0) {
        this.autoLeft = 0;
        this.render();
        return;
      }
      this.ui.autoMenu.hidden = !this.ui.autoMenu.hidden;
    });
    this.ui.autoMenu.querySelectorAll<HTMLButtonElement>('[data-auto]').forEach((b) =>
      b.addEventListener('click', () => {
        this.ui.autoMenu.hidden = true;
        this.autoLeft = Number(b.dataset.auto);
        sfx.uiClick();
        this.render();
        if (!this.busy) void this.play();
      }),
    );
    addEventListener('pointerdown', (e) => {
      if (!(e.target as HTMLElement).closest('.auto')) this.ui.autoMenu.hidden = true;
    });

    addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.repeat) return;
      if (document.querySelector('.overlay')) return;
      e.preventDefault();
      this.onSpinButton();
    });
  }

  private changeBet(dir: number) {
    if (this.busy) return;
    const next = Math.max(0, Math.min(BET_LEVELS.length - 1, this.betIndex + dir));
    if (next === this.betIndex) return;
    this.betIndex = next;
    store.set('bet', String(next));
    sfx.uiClick();
    this.render();
  }

  private render() {
    this.ui.balance.textContent = fmt(this.balance);
    this.ui.bet.textContent = fmt(this.bet);
    this.ui.win.textContent = fmt(this.winCounter);
    this.ui.betDown.disabled = this.busy || this.betIndex === 0;
    this.ui.betUp.disabled = this.busy || this.betIndex === BET_LEVELS.length - 1;
    this.ui.turbo.setAttribute('aria-pressed', String(this.turbo));
    this.ui.turbo.classList.toggle('is-active', this.turbo);
    this.ui.sound.classList.toggle('is-muted', sfx.muted);
    this.ui.auto.classList.toggle('is-active', this.autoLeft > 0);
    this.ui.autoCount.textContent = this.autoLeft > 0 ? String(this.autoLeft) : '';
    this.ui.spin.classList.toggle('is-auto', this.autoLeft > 0);
    document.body.classList.toggle('is-busy', this.busy);
  }

  private setTicker(text: string, tone: '' | 'win' | 'bonus' | 'warn' = '') {
    const t = this.ui.ticker;
    t.dataset.tone = tone;
    t.textContent = text;
    t.classList.remove('flash');
    void t.offsetWidth;
    t.classList.add('flash');
  }

  private saveBalance() {
    store.set('balance', String(this.balance));
  }

  private countWin(to: number, ms: number) {
    const from = this.winCounter;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      this.winCounter = from + (to - from) * (1 - Math.pow(1 - p, 3));
      this.ui.win.textContent = fmt(this.winCounter);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    this.ui.win.parentElement!.classList.add('is-winning');
  }

  // ─────────────────────── Spielablauf ───────────────────────

  private onSpinButton() {
    if (this.reels.spinning) {
      this.reels.slam();
      return;
    }
    if (this.autoLeft > 0 && this.busy) {
      this.autoLeft = 0;
      this.render();
      return;
    }
    if (!this.busy) void this.play();
  }

  private refillOffer() {
    this.autoLeft = 0;
    this.setTicker('Nicht genug Guthaben – ', 'warn');
    const b = document.createElement('button');
    b.className = 'ticker__action';
    b.textContent = `Auf ${fmt(START_BALANCE)} auffüllen`;
    b.addEventListener('click', () => {
      this.balance = START_BALANCE;
      this.saveBalance();
      sfx.win(1);
      this.setTicker('Guthaben aufgefüllt. Viel Glück!');
      this.render();
    });
    this.ui.ticker.append(b);
    this.render();
  }

  private async play() {
    if (this.busy) return;
    if (this.balance < this.bet) {
      this.refillOffer();
      return;
    }

    this.busy = true;
    this.presenter.clear();
    this.reels.clearExpanded();
    this.balance -= this.bet;
    this.winCounter = 0;
    this.ui.win.parentElement!.classList.remove('is-winning');
    if (this.autoLeft > 0) this.autoLeft--;
    this.saveBalance();
    this.render();
    this.setTicker(this.autoLeft > 0 ? `Autoplay – noch ${this.autoLeft}` : 'Die Walzen drehen …');

    const forced = this.forcedGrid;
    this.forcedGrid = null;
    const result = forced
      ? evaluate(forced, this.bet, REEL_STRIPS.map((s) => randInt(this.rng, s.length)))
      : spin(this.bet, this.rng);
    sfx.spinStart();
    document.body.classList.add('is-spinning');

    let scatters = 0;
    const heistSeen = new Set<SymbolId>();
    await this.reels.spin(result, this.turbo, {
      onReelLand: (reel) => {
        sfx.reelStop(reel);
        for (const s of result.grid[reel]) {
          if (s === 'scatter') sfx.scatterLand(++scatters);
          else if (HEIST_SYMBOLS.includes(s) && !heistSeen.has(s)) {
            heistSeen.add(s);
            sfx.heistLand(heistSeen.size);
          }
        }
        if (reel === REELS - 1) sfx.stopAnticipation();
      },
      onAnticipate: () => {
        sfx.startAnticipation();
        this.setTicker('Spannung …', 'bonus');
      },
    });
    sfx.stopAnticipation();
    document.body.classList.remove('is-spinning');

    await this.present(result);

    this.busy = false;
    this.render();

    if (this.autoLeft > 0) {
      if (result.bonuses.length) {
        this.autoLeft = 0;
        this.render();
        return;
      }
      await wait(result.totalWin > 0 ? (this.turbo ? 700 : 1300) : this.turbo ? 150 : 350);
      if (this.autoLeft > 0 && !this.busy) void this.play();
    }
  }

  private async present(result: SpinResult) {
    // Leichtes „Pop“ der gelandeten Specials abklingen lassen
    if (result.expandedReels.length) {
      sfx.expand();
      this.setTicker('Expanding Wild!', 'win');
      await Promise.all(result.expandedReels.map((r) => this.reels.expandReel(r)));
      await wait(1000); // Overlay ausblenden lassen, dann Gewinne zeigen
    }

    const bet = this.bet;
    const win = result.totalWin;
    if (win > 0) {
      this.presenter.showAll(result);
      const ratio = win / bet;
      sfx.win(ratio < 1 ? 0 : ratio < 3 ? 1 : ratio < 10 ? 2 : 3);
      this.balance += win;
      this.saveBalance();
      const tier = bigWinTier(win, bet);
      if (tier >= 0) {
        this.render();
        await wait(600);
        await showBigWin(win, bet, this.particles);
        this.countWin(win, 300);
      } else {
        this.countWin(win, ratio < 3 ? 500 : 1000);
        if (ratio >= 3) {
          const r = this.ui.grid.getBoundingClientRect();
          this.particles.burst(r.left + r.width / 2, r.top + r.height / 2, 50);
        }
      }
      const parts = result.lineWins.map((w) => `L${w.line + 1}`);
      if (result.scatterWin) parts.push('Scatter');
      this.setTicker(`Gewinn ${fmt(win)} · ${parts.join(' · ')}`, 'win');
      this.render();
    } else if (!result.bonuses.length) {
      this.setTicker(this.autoLeft > 0 ? `Autoplay – noch ${this.autoLeft}` : 'Nächster Versuch …');
    }

    for (const id of result.bonuses) {
      this.presenter.showAll(result);
      this.setTicker(id === 'golden' ? 'GOLDEN-MASK-Bonus ausgelöst!' : 'COUP-Bonus ausgelöst – ab an den Blackjack-Tisch!', 'bonus');
      await wait(1200);
      const bonusWin = await runBonus(id, result, this.particles, {
        get: () => this.balance,
        add: (n: number) => {
          this.balance += n;
          this.saveBalance();
          this.render();
        },
      });
      if (id === 'coup') this.setTicker('Zurück vom Blackjack-Tisch – viel Glück!');
      if (bonusWin > 0) {
        this.balance += bonusWin;
        this.saveBalance();
        if (bigWinTier(bonusWin, this.bet) >= 0) await showBigWin(bonusWin, this.bet, this.particles);
        this.setTicker(`Pick-Up-Gewinn ${fmt(bonusWin)}`, 'win');
        this.countWin(this.winCounter + bonusWin, 800);
      }
      this.render();
    }

    if (result.lineWins.length) {
      if (this.autoLeft > 0) await wait(this.turbo ? 300 : 700);
      this.presenter.cycle(result);
    }
  }
}
