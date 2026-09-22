import { sfx } from '../../audio/sfx';
import { cryptoRng } from '../../engine/rng';
import { fmt } from '../../ui/format';
import { wait } from '../../ui/reels';
import type { BonusContext } from '..';
import { FIELDS, fittingFields, MAX_SPINS, PICK_NAMES, PICK_SYMBOLS, REELS, roll, type FieldId, type PickSymbol } from './engine';
import { injectPickDefs, pickIcon } from './icons';
import './pickup.css';

const FILLER = 14;

/** Pick-Up-Bonus (Golden Mask): Kniffel-artiges Spiel mit 5 Einzel-Walzen. */
export function playPickup({ stage, bet }: BonusContext): Promise<number> {
  injectPickDefs();
  const rng = cryptoRng();

  return new Promise((resolve) => {
    let current: PickSymbol[] = Array.from({ length: REELS }, (_, i) => PICK_SYMBOLS[i]);
    let spinsUsed = 0;
    let points = 0;
    let busy = false;
    let over = false;
    let rigged: PickSymbol[] | null = null;
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

    // Walzen aufbauen
    const strips: HTMLElement[] = [];
    for (let i = 0; i < REELS; i++) {
      const reel = document.createElement('div');
      reel.className = 'pk-reel';
      const strip = document.createElement('div');
      strip.className = 'pk-reel__strip';
      strip.innerHTML = `<div class="pk-cell">${pickIcon(current[i])}</div>`;
      reel.append(strip);
      ui.reels.append(reel);
      strips.push(strip);
    }

    // Spielblock
    const fieldEls = new Map<FieldId, HTMLButtonElement>();
    for (const f of FIELDS) {
      const b = document.createElement('button');
      b.className = `pk-field${f.symbol ? ' pk-field--symbol' : ''}`;
      b.dataset.field = f.id;
      b.title = f.hint;
      b.innerHTML = `
        ${f.symbol ? `<span class="pk-field__icons">${pickIcon(f.symbol).repeat(3)}</span>` : ''}
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
        el.classList.toggle('is-used', isUsed);
        el.classList.toggle('is-fit', fits.has(f.id));
        el.disabled = isUsed || !fits.has(f.id) || busy;
        el.querySelector('.pk-field__done')!.textContent = isUsed ? `+${used.get(f.id)}` : '';
      }
      ui.spins.innerHTML = Array.from({ length: MAX_SPINS }, (_, i) => `<i class="${i < spinsUsed ? 'is-used' : ''}"></i>`).join('') + `<span>Spin ${Math.min(spinsUsed + 1, MAX_SPINS)}/${MAX_SPINS}</span>`;
      ui.spin.disabled = busy || over || spinsUsed >= MAX_SPINS;
      ui.spin.textContent = spinsUsed === 0 ? 'Drehen' : 'Nochmal drehen';
      ui.fields.textContent = `${used.size}/${FIELDS.length}`;
      ui.points.textContent = String(points);
      ui.win.textContent = fmt(points * bet);
    };

    const spinReels = async () => {
      const next = rigged ?? roll(rng);
      rigged = null;
      sfx.spinStart();
      const anims = strips.map((strip, i) => {
        const ids: PickSymbol[] = [
          next[i],
          ...Array.from({ length: FILLER }, () => PICK_SYMBOLS[Math.floor(Math.random() * PICK_SYMBOLS.length)]),
          current[i],
        ];
        strip.innerHTML = ids.map((s) => `<div class="pk-cell">${pickIcon(s)}</div>`).join('');
        const n = ids.length - 1;
        const duration = 650 + i * 170;
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
          strip.innerHTML = `<div class="pk-cell pk-cell--land">${pickIcon(next[i])}</div>`;
          a.cancel();
        });
      });
      await Promise.all(anims);
      current = next;
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
          message(`Nichts passt (${names}) – dreh nochmal!`, 'info');
        } else {
          await finish(false);
          return;
        }
      } else {
        message(spinsUsed < MAX_SPINS ? 'Feld wählen – oder nochmal drehen' : 'Letzter Spin – wähle ein Feld', 'info');
      }
      render();
    };

    const redeem = async (id: FieldId) => {
      const f = FIELDS.find((x) => x.id === id)!;
      if (busy || over || used.has(id) || spinsUsed === 0 || !f.fits(current)) return;
      used.set(id, f.points);
      points += f.points;
      spinsUsed = 0;
      sfx.win(f.points >= 10 ? 3 : f.points >= 4 ? 2 : 1);
      const el = fieldEls.get(id)!;
      el.classList.add('pop');
      message(`${f.label} eingelöst: +${f.points} Punkte (${fmt(f.points * bet)})`, 'win');
      render();
      if (used.size === FIELDS.length) {
        await wait(700);
        await finish(true);
      }
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

    message(`Drehe bis zu ${MAX_SPINS}× pro Zug und löse ein passendes Feld ein. Jeder Punkt = ${fmt(bet)}.`, 'info');
    render();
  });
}
