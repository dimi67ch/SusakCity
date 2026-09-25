import { sfx } from '../../audio/sfx';
import { cryptoRng } from '../../engine/rng';
import { fmt } from '../../ui/format';
import { wait } from '../../ui/reels';
import type { BonusContext } from '..';
import { fieldScore, FIELDS, fittingFields, MAX_SPINS, maxSame, PICK_NAMES, PICK_SYMBOLS, REELS, roll, type FieldId, type PickSymbol } from './engine';
import { pickIcon, pickIconNode, shapeIcon, type ShapeKind } from './icons';
import './pickup.css';

const FILLER = 9;

/** Muster aus Formen, das jedes Kombi-Feld erklärt (Gruppe 0 = gold, 1 = cyan) */
const PATTERNS: Partial<Record<FieldId, [ShapeKind, 0 | 1][]>> = {
  pair: [['square', 0], ['square', 0]],
  straight: [['square', 0], ['circle', 0], ['triangle', 0], ['diamond', 0], ['star', 0]],
  fullhouse: [['square', 0], ['square', 0], ['square', 0], ['circle', 1], ['circle', 1]],
  four: [['square', 0], ['square', 0], ['square', 0], ['square', 0]],
  five: [['square', 0], ['square', 0], ['square', 0], ['square', 0], ['square', 0]],
  joker: [['joker', 0]],
};

function cell(s: PickSymbol, land = false): HTMLElement {
  const c = document.createElement('div');
  c.className = land ? 'pk-cell pk-cell--land' : 'pk-cell';
  c.append(pickIconNode(s));
  return c;
}

/** Pick-Up-Bonus (Golden Mask): Kniffel-artiges Spiel mit 5 Einzel-Walzen. */
export function playPickup({ stage, bet }: BonusContext): Promise<number> {
  const rng = cryptoRng();

  return new Promise((resolve) => {
    let current: PickSymbol[] = Array.from({ length: REELS }, (_, i) => PICK_SYMBOLS[i]);
    let spinsUsed = 0;
    let points = 0;
    let busy = false;
    let over = false;
    let rigged: PickSymbol[] | null = null;
    /** Gesperrte Walzen (nur zwischen Spin 1 und Spin 2) */
    let held: boolean[] = Array(REELS).fill(false);
    const used = new Map<FieldId, number>();

    stage.classList.add('pk');
    stage.innerHTML = `
      <div class="pk__bg" aria-hidden="true"></div>
      <header class="pk__head">
        <p class="pk__eyebrow">Golden Mask Bonus</p>
        <h2 class="pk__title">PICK-UP</h2>
        <div class="pk__stats">
          <div><span>Felder</span><strong data-fields>0/${FIELDS.length}</strong></div>
          <div><span>Punkte</span><strong data-points>0</strong></div>
          <div><span>Gewinn</span><strong data-win>${fmt(0)}</strong></div>
        </div>
      </header>
      <div class="pk__machine">
        <div class="pk__reels" data-reels></div>
        <div class="pk__row">
          <div class="pk__spins" data-spins></div>
          <button class="pk__spin" data-spin>Drehen</button>
        </div>
        <p class="pk__msg" data-msg></p>
      </div>
      <div class="pk__card" data-card></div>
      <div class="pk__end" data-end hidden></div>`;

    const $ = <T extends HTMLElement = HTMLElement>(sel: string) => stage.querySelector(sel) as T;
    const ui = {
      reels: $('[data-reels]'),
      spins: $('[data-spins]'),
      spin: $<HTMLButtonElement>('[data-spin]'),
      msg: $('[data-msg]'),
      card: $('[data-card]'),
      fields: $('[data-fields]'),
      points: $('[data-points]'),
      win: $('[data-win]'),
      end: $('[data-end]'),
    };

    // Walzen aufbauen – nach dem 1. Spin per Klick sperrbar
    const strips: HTMLElement[] = [];
    const reelEls: HTMLButtonElement[] = [];
    for (let i = 0; i < REELS; i++) {
      const reel = document.createElement('button');
      reel.className = 'pk-reel';
      reel.setAttribute('aria-label', `Walze ${i + 1} sperren`);
      const strip = document.createElement('div');
      strip.className = 'pk-reel__strip';
      strip.append(cell(current[i]));
      const lock = document.createElement('span');
      lock.className = 'pk-reel__lock';
      lock.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Gesperrt`;
      reel.append(strip, lock);
      reel.addEventListener('click', () => toggleHold(i));
      ui.reels.append(reel);
      strips.push(strip);
      reelEls.push(reel);
    }

    const canHold = () => spinsUsed >= 1 && spinsUsed < MAX_SPINS && !busy && !over;

    const toggleHold = (i: number) => {
      if (!canHold()) return;
      held[i] = !held[i];
      sfx.uiClick();
      render();
    };

    // Spielblock
    const fieldEls = new Map<FieldId, HTMLButtonElement>();
    for (const f of FIELDS) {
      const b = document.createElement('button');
      b.className = `pk-field${f.symbol ? ' pk-field--symbol' : ''}`;
      b.dataset.field = f.id;
      b.title = f.hint;
      const pattern = PATTERNS[f.id];
      b.innerHTML = `
        ${f.symbol ? `<span class="pk-field__icons">${pickIcon(f.symbol).repeat(3)}</span>` : ''}
        ${pattern ? `<span class="pk-field__icons">${pattern.map(([k, t]) => shapeIcon(k, t)).join('')}</span>` : ''}
        <span class="pk-field__label">${f.label}</span>
        <span class="pk-field__pts">${f.points}×</span>
        <span class="pk-field__done"></span>`;
      b.addEventListener('click', () => void redeem(f.id));
      ui.card.append(b);
      fieldEls.set(f.id, b);
    }

    const message = (text: string, tone: '' | 'win' | 'lose' | 'info' = '') => {
      ui.msg.textContent = text;
      ui.msg.dataset.tone = tone;
    };

    const render = () => {
      const fits = spinsUsed > 0 && !over ? new Set(fittingFields(current, new Set(used.keys())).map((f) => f.id)) : new Set<FieldId>();
      for (const f of FIELDS) {
        const el = fieldEls.get(f.id)!;
        const isUsed = used.has(f.id);
        const isFit = fits.has(f.id);
        el.classList.toggle('is-used', isUsed);
        el.classList.toggle('is-fit', isFit);
        el.disabled = isUsed || !isFit || busy;
        el.querySelector('.pk-field__done')!.textContent = isUsed ? `+${used.get(f.id)}` : '';
        // Punkte je nach Wurf (3× Symbol zahlt mehr bei 4 oder 5 gleichen)
        const pts = isFit ? fieldScore(f, current) : f.points;
        el.querySelector('.pk-field__pts')!.textContent = `${pts}×`;
        el.classList.toggle('is-boost', isFit && pts > f.points);
      }
      ui.spins.innerHTML = Array.from({ length: MAX_SPINS }, (_, i) => `<i class="${i < spinsUsed ? 'is-used' : ''}"></i>`).join('') + `<span>Spin ${Math.min(spinsUsed + 1, MAX_SPINS)}/${MAX_SPINS}</span>`;
      const holdable = canHold();
      reelEls.forEach((r, i) => {
        r.classList.toggle('is-held', held[i]);
        r.classList.toggle('is-holdable', holdable);
        r.disabled = !holdable;
        r.setAttribute('aria-pressed', String(held[i]));
      });
      ui.spin.disabled = busy || over || spinsUsed >= MAX_SPINS || held.every(Boolean);
      ui.spin.textContent =
        spinsUsed === 0 ? 'Drehen' : spinsUsed < MAX_SPINS ? `Nochmal drehen (${MAX_SPINS - spinsUsed})` : 'Feld wählen';
      ui.fields.textContent = `${used.size}/${FIELDS.length}`;
      ui.points.textContent = String(points);
      ui.win.textContent = fmt(points * bet);
    };

    const spinReels = async () => {
      const next = roll(rng, current, held);
      if (rigged) rigged.forEach((s, i) => !held[i] && (next[i] = s));
      rigged = null;
      sfx.spinStart();
      let k = 0;
      const anims = strips.map((strip, i) => {
        if (held[i]) return Promise.resolve();
        const order = k++;
        const ids: PickSymbol[] = [
          next[i],
          ...Array.from({ length: FILLER }, () => PICK_SYMBOLS[Math.floor(Math.random() * PICK_SYMBOLS.length)]),
          current[i],
        ];
        strip.replaceChildren(...ids.map((s) => cell(s)));
        strip.classList.add('is-spinning');
        const n = ids.length - 1;
        const duration = 650 + order * 170;
        const a = strip.animate(
          [
            { transform: `translateY(${-n * 100}%)` },
            { transform: 'translateY(6%)', offset: 0.9 },
            { transform: 'translateY(0)' },
          ],
          { duration, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', fill: 'forwards' },
        );
        return a.finished.then(() => {
          sfx.reelStop(i);
          strip.classList.remove('is-spinning');
          strip.replaceChildren(cell(next[i], true));
          a.cancel();
        });
      });
      await Promise.all(anims);
      current = next;
      // Sperren bleiben für den ganzen Zug bestehen (erst beim Einlösen zurückgesetzt)
    };

    const spin = async () => {
      if (busy || over || spinsUsed >= MAX_SPINS) return;
      busy = true;
      message('');
      render();
      await spinReels();
      spinsUsed++;
      busy = false;
      const fits = fittingFields(current, new Set(used.keys()));
      const names = current.map((s) => PICK_NAMES[s]).join(' · ');
      if (fits.length === 0) {
        if (spinsUsed < MAX_SPINS) {
          message(`Nichts passt (${names}) – Walzen sperren und nochmal drehen!`, 'info');
        } else {
          await finish(false);
          return;
        }
      } else {
        message(spinsUsed < MAX_SPINS ? 'Feld wählen – oder Walzen antippen zum Sperren und nochmal drehen' : 'Letzter Spin – wähle ein Feld', 'info');
      }
      render();
    };

    const redeem = async (id: FieldId) => {
      const f = FIELDS.find((x) => x.id === id)!;
      if (busy || over || used.has(id) || spinsUsed === 0 || !f.fits(current)) return;
      const pts = fieldScore(f, current);
      used.set(id, pts);
      points += pts;
      spinsUsed = 0;
      held = Array(REELS).fill(false);
      sfx.win(pts >= 9 ? 3 : pts >= 4 ? 2 : 1);
      const el = fieldEls.get(id)!;
      el.classList.add('pop');
      const same = f.symbol ? current.filter((s) => s === f.symbol).length : maxSame(current);
      const bonus = pts > f.points ? ` (${same}× gleich!)` : '';
      message(`${f.label} eingelöst: +${pts} ${pts === 1 ? 'Punkt' : 'Punkte'}${bonus} – ${fmt(pts * bet)}`, 'win');
      render();
      if (used.size === FIELDS.length) {
        await wait(700);
        await finish(true);
        return;
      }
      // Nächster Zug startet automatisch mit dem 1. Spin
      await wait(750);
      if (!over && !busy && spinsUsed === 0) await spin();
    };

    const finish = async (complete: boolean) => {
      over = true;
      render();
      if (!complete) {
        sfx.bjLose();
        message('Kein freies Feld passt – Runde vorbei', 'lose');
        await wait(1400);
      }
      const win = points * bet;
      ui.end.hidden = false;
      ui.end.innerHTML = `
        <div class="pk-end">
          <p class="pk__eyebrow">${complete ? 'Alle Felder eingelöst!' : 'Runde vorbei'}</p>
          <h3>${used.size} ${used.size === 1 ? 'Feld' : 'Felder'} · ${points} Punkte</h3>
          <div class="pk-end__win">${fmt(win)}</div>
          <p class="pk-end__calc">${points} Punkte × ${fmt(bet)} Einsatz</p>
          <button class="btn-primary" data-collect>Gewinn einsammeln</button>
        </div>`;
      if (win > 0) sfx.win(3);
      ui.end.querySelector('[data-collect]')!.addEventListener('click', () => {
        sfx.uiClick();
        removeEventListener('keydown', onKey);
        resolve(win);
      }, { once: true });
    };

    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= REELS) {
        toggleHold(n - 1);
        return;
      }
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (!ui.end.hidden) (ui.end.querySelector('[data-collect]') as HTMLButtonElement | null)?.click();
        else void spin();
      }
    };
    addEventListener('keydown', onKey);
    ui.spin.addEventListener('click', () => void spin());

    if (import.meta.env.DEV) {
      // Nächsten Wurf festlegen, z. B. pk.rig('star star star heart heart')
      (window as unknown as { pk: unknown }).pk = { rig: (w: string) => (rigged = w.split(' ') as PickSymbol[]) };
    }

    message(`Bis zu ${MAX_SPINS} Spins pro Zug – zwischendurch kannst du Walzen sperren. Jeder Punkt = ${fmt(bet)}.`, 'info');
    render();
  });
}
