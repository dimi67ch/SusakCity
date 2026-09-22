import { REELS, ROWS, TIMING } from '../config/game';
import { HEIST_SYMBOLS, type SymbolId } from '../config/symbols';
import type { Grid, SpinResult } from '../engine/slot';
import { REEL_STRIPS } from '../engine/strips';
import { iconSvg } from './icons';
import { renderSymbol } from './symbolArt';

/** Vorgerenderte Symbol-Knoten, die beim Drehen nur noch geklont werden. */
const symbolCache = new Map<SymbolId, HTMLElement>();
function symbolNode(id: SymbolId): Node {
  let n = symbolCache.get(id);
  if (!n) {
    n = renderSymbol(id);
    symbolCache.set(id, n);
  }
  return n.cloneNode(true);
}

const WINDUP_MS = 130;
const ACCEL_MS = 180;
const DECEL_MS = 320;
const BOUNCE_MS = 200;
const OVERSHOOT = 0.22; // in Zellen
const WINDUP = 0.22;

interface ReelRun {
  reel: number;
  t0: number;
  duration: number;
  /** Strecke in Zellen bis zur Endposition */
  dist: number;
  /** Geschwindigkeit Zellen/ms */
  v: number;
  ids: SymbolId[];
  cells: HTMLElement[];
  shown: (SymbolId | null)[];
  landed: boolean;
  done: boolean;
}

export interface SpinHooks {
  onReelLand: (reel: number) => void;
  onAnticipate: (reel: number) => void;
}

export class ReelsView {
  readonly el: HTMLElement;
  private reels: HTMLElement[] = [];
  private strips: HTMLElement[] = [];
  private current: Grid;
  private runs: ReelRun[] = [];
  private raf = 0;

  constructor(root: HTMLElement, initial: Grid) {
    this.el = root;
    this.current = initial;
    for (let r = 0; r < REELS; r++) {
      const reel = document.createElement('div');
      reel.className = 'reel';
      reel.dataset.reel = String(r);
      const strip = document.createElement('div');
      strip.className = 'reel__strip';
      reel.append(strip);
      root.append(reel);
      this.reels.push(reel);
      this.strips.push(strip);
      this.renderIdle(r, initial[r]);
    }
  }

  private makeCell(id: SymbolId, total: number, row?: number): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.style.height = `${100 / total}%`;
    if (row !== undefined) cell.dataset.row = String(row);
    cell.append(renderSymbol(id));
    return cell;
  }

  private renderIdle(r: number, col: SymbolId[]) {
    const strip = this.strips[r];
    strip.replaceChildren(...col.map((id, row) => this.makeCell(id, ROWS, row)));
    strip.style.height = '100%';
    strip.style.transform = '';
  }

  cell(reel: number, row: number): HTMLElement {
    return this.strips[reel].children[row] as HTMLElement;
  }

  reelEl(reel: number): HTMLElement {
    return this.reels[reel];
  }

  get spinning() {
    return this.runs.some((r) => !r.done);
  }

  /** Berechnet, ab welcher Walze Spannung aufgebaut wird (Scatter / Heist). */
  static anticipation(grid: Grid): boolean[] {
    const out: boolean[] = [];
    for (let r = 0; r < REELS; r++) {
      const before = grid.slice(0, r).flat();
      const scatters = before.filter((s) => s === 'scatter').length;
      const heist = new Set(before.filter((s) => HEIST_SYMBOLS.includes(s))).size;
      out.push(r > 0 && (scatters >= 2 || heist >= 2));
    }
    return out;
  }

  spin(result: SpinResult, turbo: boolean, hooks: SpinHooks): Promise<void> {
    const timing = turbo ? TIMING.turbo : TIMING.normal;
    const speed = turbo ? 0.034 : 0.026; // Zellen pro ms
    const antic = ReelsView.anticipation(result.grid);
    const now = performance.now();
    let extra = 0;
    this.runs = [];

    for (let r = 0; r < REELS; r++) {
      if (antic[r]) extra += timing.anticipation;
      const duration = timing.firstStop + r * timing.stagger + extra;
      const cruise = duration - WINDUP_MS - ACCEL_MS - DECEL_MS;
      const k = Math.max(4, Math.round(speed * (ACCEL_MS / 2 + cruise + DECEL_MS / 2)) - ROWS);
      const dist = ROWS + k;
      const v = (dist + OVERSHOOT) / (ACCEL_MS / 2 + cruise + DECEL_MS / 2);

      const strip = REEL_STRIPS[r];
      const stop = result.stops[r];
      const at = (i: number) => strip[((i % strip.length) + strip.length) % strip.length];
      // Virtueller Streifen (oben → unten); gerendert werden nur ROWS + 2 wiederverwendete Zellen.
      const ids: SymbolId[] = [
        at(stop - 1),
        ...result.grid[r],
        ...Array.from({ length: k }, (_, j) => at(stop + ROWS + j)),
        ...this.current[r],
        at(stop + ROWS + k + 7),
        at(stop + ROWS + k + 8),
      ];

      const el = this.strips[r];
      el.classList.add('reel__strip--spin');
      el.style.height = '100%';
      el.style.transform = '';
      const cells: HTMLElement[] = [];
      for (let i = 0; i < ROWS + 2; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cells.push(cell);
      }
      el.replaceChildren(...cells);
      this.reels[r].classList.remove('anticipate', 'landed');
      this.runs.push({ reel: r, t0: now, duration, dist, v, ids, cells, shown: new Array(cells.length).fill(null), landed: false, done: false });
    }

    return new Promise((resolve) => {
      const tick = (t: number) => {
        let allDone = true;
        for (const run of this.runs) {
          if (run.done) continue;
          allDone = false;
          this.step(run, t, result, hooks, antic);
        }
        if (allDone) {
          this.current = result.grid;
          resolve();
          return;
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  private step(run: ReelRun, now: number, result: SpinResult, hooks: SpinHooks, antic: boolean[]) {
    const t = now - run.t0;
    const { duration, v, dist } = run;
    const cruiseEnd = duration - DECEL_MS;
    let d: number;

    if (t < WINDUP_MS) {
      d = -WINDUP * Math.sin((Math.PI * t) / WINDUP_MS);
    } else if (t < WINDUP_MS + ACCEL_MS) {
      const u = t - WINDUP_MS;
      d = (0.5 * v * u * u) / ACCEL_MS;
    } else if (t < cruiseEnd) {
      d = (v * ACCEL_MS) / 2 + v * (t - WINDUP_MS - ACCEL_MS);
    } else if (t < duration) {
      const u = t - cruiseEnd;
      const base = (v * ACCEL_MS) / 2 + v * (cruiseEnd - WINDUP_MS - ACCEL_MS);
      d = base + v * u - (0.5 * v * u * u) / DECEL_MS;
    } else {
      if (!run.landed) {
        run.landed = true;
        this.reels[run.reel].classList.remove('anticipate');
        this.reels[run.reel].classList.add('landed');
        hooks.onReelLand(run.reel);
        const next = run.reel + 1;
        if (next < REELS && antic[next] && !this.runs[next].landed) {
          this.reels[next].classList.add('anticipate');
          hooks.onAnticipate(next);
        }
      }
      const u = Math.min(1, (t - duration) / BOUNCE_MS);
      const ease = 1 - Math.pow(1 - u, 3);
      d = dist + OVERSHOOT * (1 - ease) - Math.sin(Math.PI * u) * 0.05;
      if (u >= 1) {
        run.done = true;
        this.strips[run.reel].classList.remove('reel__strip--spin');
        this.renderIdle(run.reel, result.grid[run.reel]);
        result.grid[run.reel].forEach((s, row) => {
          if (s === 'scatter' || HEIST_SYMBOLS.includes(s)) this.cell(run.reel, row).classList.add('cell--land');
        });
        return;
      }
    }

    // Oberkante des Fensters in Streifen-Koordinaten (Zellen)
    const top = 1 + dist - d;
    const first = Math.floor(top);
    const frac = top - first;
    const fast = t > WINDUP_MS + ACCEL_MS * 0.5 && t < duration - DECEL_MS * 0.5;
    for (let i = 0; i < run.cells.length; i++) {
      const cell = run.cells[i];
      const id = run.ids[first + i - 1] ?? run.ids[0];
      if (run.shown[i] !== id) {
        run.shown[i] = id;
        cell.replaceChildren(symbolNode(id));
      }
      cell.style.transform = `translate3d(0, ${(i - 1 - frac) * 100}%, 0)`;
    }
    this.strips[run.reel].classList.toggle('is-fast', fast);
  }

  /** Schneller Stopp: alle laufenden Walzen springen in die Abbremsphase. */
  slam() {
    const now = performance.now();
    for (const run of this.runs) {
      if (run.done || run.landed) continue;
      const t = now - run.t0;
      const target = run.duration - DECEL_MS * 0.35;
      if (t < target) run.t0 = now - target;
    }
  }

  cancel() {
    cancelAnimationFrame(this.raf);
  }

  /** Verwandelt eine Walze in eine komplette Wild-Walze. */
  async expandReel(reel: number): Promise<void> {
    const reelEl = this.reels[reel];
    const cells = [...this.strips[reel].children] as HTMLElement[];
    const wildRow = cells.findIndex((c) => c.querySelector('.sym')?.getAttribute('data-id') === 'wild');
    const overlay = document.createElement('div');
    overlay.className = 'expand-overlay';
    overlay.style.setProperty('--origin', `${((wildRow + 0.5) / ROWS) * 100}%`);
    overlay.innerHTML = `
      <div class="expand-overlay__inner">
        <div class="expand-overlay__watch">${iconSvg('wild')}</div>
        <span class="expand-overlay__word">W</span>
        <span class="expand-overlay__word">I</span>
        <span class="expand-overlay__word">L</span>
        <span class="expand-overlay__word">D</span>
      </div>`;
    reelEl.append(overlay);
    reelEl.classList.add('expanded');
    await wait(520);
    this.current = this.current.map((col, r) => (r === reel ? col.map(() => 'wild' as SymbolId) : col));
    cells.forEach((c, row) => {
      c.replaceChildren(renderSymbol('wild'));
      c.dataset.row = String(row);
    });
  }

  clearExpanded() {
    this.reels.forEach((r) => {
      r.classList.remove('expanded', 'landed', 'anticipate');
      r.querySelector('.expand-overlay')?.remove();
    });
  }
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
