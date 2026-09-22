import { PAYLINES, PAYLINE_COLORS, REELS, ROWS } from '../config/game';
import type { LineWin, Pos, SpinResult } from '../engine/slot';
import { fmt } from './format';
import type { ReelsView } from './reels';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class WinPresenter {
  private svg: SVGSVGElement;
  private labels: HTMLElement;
  private cycleTimer = 0;

  constructor(private gridEl: HTMLElement, private reels: ReelsView) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.classList.add('paylines');
    this.svg.setAttribute('viewBox', `0 0 ${REELS * 100} ${ROWS * 100}`);
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.labels = document.createElement('div');
    this.labels.className = 'win-labels';
    gridEl.append(this.svg, this.labels);
  }

  private linePath(line: number): string {
    const rows = PAYLINES[line];
    const pts = rows.map((row, reel) => `${reel * 100 + 50},${row * 100 + 50}`);
    return `M0,${rows[0] * 100 + 50} L${pts.join(' L')} L${REELS * 100},${rows[REELS - 1] * 100 + 50}`;
  }

  private drawLine(line: number, dim = false) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('payline');
    if (dim) g.classList.add('payline--dim');
    g.style.setProperty('--line-color', PAYLINE_COLORS[line]);
    const d = this.linePath(line);
    for (const cls of ['payline__glow', 'payline__core']) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('pathLength', '1');
      p.classList.add(cls);
      g.append(p);
    }
    this.svg.append(g);
  }

  /** Vorschau einer Gewinnlinie (Hover über Linienmarker). */
  preview(line: number | null) {
    this.svg.querySelectorAll('.payline--preview').forEach((n) => n.remove());
    if (line === null) return;
    this.drawLine(line);
    this.svg.lastElementChild?.classList.add('payline--preview');
  }

  private highlight(positions: Pos[], cls = 'cell--win') {
    for (const [reel, row] of positions) this.reels.cell(reel, row)?.classList.add(cls);
  }

  private label(win: LineWin) {
    const [reel, row] = win.positions[win.positions.length - 1];
    const el = document.createElement('div');
    el.className = 'win-label';
    el.style.left = `${((reel + 0.5) / REELS) * 100}%`;
    el.style.top = `${((row + 0.5) / ROWS) * 100}%`;
    el.style.setProperty('--line-color', PAYLINE_COLORS[win.line]);
    el.textContent = fmt(win.amount);
    this.labels.append(el);
  }

  showAll(result: SpinResult) {
    this.clear();
    const hasAny = result.lineWins.length || result.scatterWin || result.heistPositions.length || result.scatterCount >= 3;
    if (!hasAny) return;
    this.gridEl.classList.add('has-wins');
    for (const w of result.lineWins) {
      this.drawLine(w.line);
      this.highlight(w.positions);
    }
    if (result.scatterCount >= 3) this.highlight(result.scatterPositions, 'cell--scatter');
    if (result.heistPositions.length) this.highlight(result.heistPositions, 'cell--heist');
  }

  /** Zeigt Liniengewinne nacheinander in Endlosschleife, bis clear() aufgerufen wird. */
  cycle(result: SpinResult) {
    const wins = result.lineWins;
    if (wins.length < 1) return;
    let i = 0;
    const show = () => {
      this.clear(false);
      this.gridEl.classList.add('has-wins');
      const w = wins[i % wins.length];
      this.drawLine(w.line);
      this.highlight(w.positions);
      this.label(w);
      i++;
    };
    show();
    if (wins.length > 1) this.cycleTimer = window.setInterval(show, 1700);
  }

  clear(stopCycle = true) {
    if (stopCycle) clearInterval(this.cycleTimer);
    this.svg.querySelectorAll('.payline:not(.payline--preview)').forEach((n) => n.remove());
    this.labels.replaceChildren();
    this.gridEl.classList.remove('has-wins');
    this.gridEl.querySelectorAll('.cell--win, .cell--scatter, .cell--heist').forEach((c) => c.classList.remove('cell--win', 'cell--scatter', 'cell--heist'));
  }
}
