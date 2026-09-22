import { sfx } from '../../audio/sfx';
import { cryptoRng } from '../../engine/rng';
import { fmt } from '../../ui/format';
import { wait } from '../../ui/reels';
import type { BonusContext } from '..';
import {
  canDouble,
  canSplit,
  cardValue,
  dealerShouldHit,
  handValue,
  isBlackjack,
  newHand,
  settle,
  Shoe,
  type Card,
  type PlayerHand,
} from './engine';
import { SCENE_HTML } from './scene';
import './blackjack.css';

export const MIN_BET = 10;
const CHIPS = [10, 50, 100, 500, 1000, 5000];
const DEAL_MS = 380;

type Phase = 'bet' | 'insurance' | 'play' | 'dealer' | 'done';

const OUTCOME_LABEL: Record<string, string> = {
  blackjack: 'BLACKJACK',
  win: 'GEWONNEN',
  push: 'PUSH',
  lose: 'VERLOREN',
  bust: 'BUST',
};

function chipClass(v: number) {
  return `chip chip--${v}`;
}

function chipLabel(v: number) {
  return v >= 1000 ? `${v / 1000}K` : String(v);
}

function cardEl(c: Card, faceDown = false): HTMLElement {
  const el = document.createElement('div');
  const red = c.suit === '♥' || c.suit === '♦';
  el.className = `card${red ? ' card--red' : ''}${faceDown ? ' is-down' : ''}`;
  el.innerHTML = `
    <div class="card__inner">
      <div class="card__front">
        <span class="card__corner"><b>${c.rank}</b><i>${c.suit}</i></span>
        <span class="card__pip">${c.suit}</span>
        <span class="card__corner card__corner--br"><b>${c.rank}</b><i>${c.suit}</i></span>
      </div>
      <div class="card__back"><span>S</span></div>
    </div>`;
  return el;
}

function totalLabel(cards: Card[], hideHole = false, final = false): string {
  if (hideHole) return String(cardValue(cards[0]));
  const { total, soft } = handValue(cards);
  if (isBlackjack(cards)) return 'BJ';
  return soft && total < 21 && !final ? `${total - 10}/${total}` : String(total);
}

/** Echtes Blackjack gegen den Dealer mit dem Bankguthaben des Spielers. */
export function playBlackjack({ stage, wallet }: BonusContext): Promise<number> {
  return new Promise((resolve) => {
    const shoe = new Shoe(cryptoRng());
    let phase: Phase = 'bet';
    let pendingBet = 0;
    let lastBet = 0;
    let hands: PlayerHand[] = [];
    let active = 0;
    let dealer: Card[] = [];
    let insurance = 0;
    let sessionNet = 0;
    let busy = false;

    stage.classList.add('bj');
    stage.innerHTML = `
      ${SCENE_HTML}
      <div class="bj__play">
        <div class="bj__shoe" aria-hidden="true"><span></span></div>
        <div class="bj__dealer">
          <div class="bj__label">Dealer <b class="bj__total" data-dealer-total></b></div>
          <div class="bj__cards" data-dealer></div>
        </div>
        <div class="bj__msg" data-msg></div>
        <div class="bj__hands" data-hands></div>
        <div class="bj__spot" data-spot><div class="bj__stack" data-stack></div><span data-spot-amount></span></div>
      </div>
      <div class="bj__bar">
        <div class="bj__stats">
          <div><span>Bank</span><strong data-bank></strong></div>
          <div><span>Session</span><strong data-net></strong></div>
        </div>
        <div class="bj__controls" data-controls></div>
        <button class="bj-btn bj-btn--ghost" data-leave>Tisch verlassen</button>
      </div>`;

    const $ = <T extends HTMLElement = HTMLElement>(sel: string) => stage.querySelector(sel) as T;
    const ui = {
      dealer: $('[data-dealer]'),
      dealerTotal: $('[data-dealer-total]'),
      hands: $('[data-hands]'),
      msg: $('[data-msg]'),
      stack: $('[data-stack]'),
      spotAmount: $('[data-spot-amount]'),
      spot: $('[data-spot]'),
      bank: $('[data-bank]'),
      net: $('[data-net]'),
      controls: $('[data-controls]'),
      leave: $<HTMLButtonElement>('[data-leave]'),
    };

    // ─────────────── Anzeige ───────────────

    const message = (text: string, tone: '' | 'win' | 'lose' | 'info' = '') => {
      ui.msg.textContent = text;
      ui.msg.dataset.tone = tone;
      ui.msg.classList.remove('pop');
      void ui.msg.offsetWidth;
      if (text) ui.msg.classList.add('pop');
    };

    const renderStack = (amount: number) => {
      ui.stack.replaceChildren();
      let rest = amount;
      const chips: number[] = [];
      for (const v of [...CHIPS].reverse()) {
        while (rest >= v && chips.length < 10) {
          chips.push(v);
          rest -= v;
        }
      }
      chips.reverse().forEach((v, i) => {
        const c = document.createElement('span');
        c.className = chipClass(v);
        c.style.setProperty('--i', String(i));
        c.textContent = chipLabel(v);
        ui.stack.append(c);
      });
      ui.spotAmount.textContent = amount ? fmt(amount) : 'Einsatz platzieren';
      ui.spot.classList.toggle('has-bet', amount > 0);
    };

    const renderStats = () => {
      ui.bank.textContent = fmt(wallet.get());
      ui.net.textContent = `${sessionNet >= 0 ? '+' : '−'}${fmt(Math.abs(sessionNet))}`;
      ui.net.dataset.tone = sessionNet > 0 ? 'win' : sessionNet < 0 ? 'lose' : '';
      ui.leave.disabled = phase !== 'bet' && phase !== 'done';
    };

    const renderHands = () => {
      ui.hands.replaceChildren();
      hands.forEach((h, i) => {
        const el = document.createElement('div');
        el.className = 'bj-hand';
        el.classList.toggle('is-active', phase === 'play' && i === active && hands.length > 1);
        if (h.outcome) el.dataset.outcome = h.outcome;
        el.innerHTML = `
          <div class="bj__cards"></div>
          <div class="bj-hand__info">
            <b class="bj__total">${h.cards.length ? totalLabel(h.cards, false, h.done || phase === 'done') : ''}</b>
            <span>${fmt(h.bet)}${h.doubled ? ' · x2' : ''}</span>
          </div>
          ${h.outcome ? `<div class="bj-hand__result">${OUTCOME_LABEL[h.outcome]}${(h.payout ?? 0) > h.bet ? ` +${fmt(h.payout! - h.bet)}` : ''}</div>` : ''}`;
        const cards = el.querySelector('.bj__cards')!;
        h.cards.forEach((c) => {
          const ce = cardEl(c);
          ce.classList.add('no-anim');
          cards.append(ce);
        });
        ui.hands.append(el);
      });
    };

    const renderDealerTotal = () => {
      const hidden = ui.dealer.querySelector('.is-down');
      ui.dealerTotal.textContent = dealer.length ? totalLabel(dealer, !!hidden, phase === 'done') : '';
    };

    const button = (label: string, onClick: () => void, opts: { primary?: boolean; disabled?: boolean; key?: string } = {}) => {
      const b = document.createElement('button');
      b.className = `bj-btn${opts.primary ? ' bj-btn--primary' : ''}`;
      b.innerHTML = opts.key ? `${label}<kbd>${opts.key}</kbd>` : label;
      b.disabled = !!opts.disabled;
      b.addEventListener('click', () => {
        if (busy || b.disabled) return;
        sfx.uiClick();
        onClick();
      });
      return b;
    };

    const renderControls = () => {
      const box = ui.controls;
      box.replaceChildren();
      const bank = wallet.get();

      if (phase === 'bet') {
        const chips = document.createElement('div');
        chips.className = 'bj__chips';
        CHIPS.forEach((v) => {
          const c = document.createElement('button');
          c.className = chipClass(v);
          c.textContent = chipLabel(v);
          c.disabled = pendingBet + v > bank;
          c.setAttribute('aria-label', `Chip ${fmt(v)}`);
          c.addEventListener('click', () => {
            if (pendingBet + v > wallet.get()) return;
            pendingBet += v;
            sfx.chip();
            renderStack(pendingBet);
            renderControls();
          });
          chips.append(c);
        });
        box.append(chips);
        box.append(
          button('All In', () => {
            pendingBet = Math.floor(wallet.get());
            sfx.chip();
            renderStack(pendingBet);
            renderControls();
          }, { disabled: bank < MIN_BET }),
          button('Löschen', () => {
            pendingBet = 0;
            renderStack(0);
            renderControls();
          }, { disabled: pendingBet === 0 }),
          button('Austeilen', () => void deal(), { primary: true, disabled: pendingBet < MIN_BET || pendingBet > bank, key: '␣' }),
        );
        if (bank < MIN_BET) message('Nicht genug Guthaben für eine Hand', 'lose');
        return;
      }

      if (phase === 'insurance') {
        const cost = hands[0].bet / 2;
        box.append(
          button(`Versicherung ${fmt(cost)}`, () => void resolveInsurance(true), { disabled: bank < cost }),
          button('Keine Versicherung', () => void resolveInsurance(false), { primary: true }),
        );
        return;
      }

      if (phase === 'play') {
        const h = hands[active];
        box.append(
          button('Karte', () => void hit(), { primary: true, key: 'H' }),
          button('Halten', () => void stand(), { key: 'S' }),
          button('Verdoppeln', () => void double(), { disabled: !canDouble(h, bank), key: 'D' }),
          button('Teilen', () => void split(), { disabled: !canSplit(h, hands.length, bank), key: 'P' }),
        );
        return;
      }

      if (phase === 'done') {
        box.append(
          button(`Nochmal ${fmt(lastBet)}`, () => {
            clearTable();
            pendingBet = lastBet;
            void deal();
          }, { primary: true, disabled: bank < lastBet || lastBet < MIN_BET, key: '␣' }),
          button('Einsatz ändern', () => {
            clearTable();
            pendingBet = 0;
            phase = 'bet';
            renderAll();
          }),
        );
      }
    };

    const renderAll = () => {
      renderStats();
      renderHands();
      renderDealerTotal();
      renderControls();
    };

    // ─────────────── Ablauf ───────────────

    const clearTable = () => {
      hands = [];
      dealer = [];
      insurance = 0;
      ui.dealer.replaceChildren();
      message('');
      renderStack(0);
    };

    const dealTo = async (target: 'dealer' | number, faceDown = false) => {
      const c = shoe.draw();
      sfx.cardDeal();
      if (target === 'dealer') {
        dealer.push(c);
        ui.dealer.append(cardEl(c, faceDown));
        renderDealerTotal();
      } else {
        hands[target].cards.push(c);
        renderHands();
        // Nur die neue Karte animieren
        const cards = ui.hands.children[target]?.querySelectorAll('.card');
        cards?.[cards.length - 1]?.classList.remove('no-anim');
      }
      await wait(DEAL_MS);
      return c;
    };

    const revealHole = async () => {
      const hole = ui.dealer.querySelector('.is-down');
      if (!hole) return;
      hole.classList.remove('is-down');
      sfx.cardFlip();
      await wait(420);
      renderDealerTotal();
    };

    const deal = async () => {
      const bank = wallet.get();
      if (pendingBet < MIN_BET || pendingBet > bank) return;
      busy = true;
      if (shoe.needsShuffle) {
        message('Neuer Schlitten wird gemischt …', 'info');
        shoe.shuffle();
        await wait(900);
      }
      lastBet = pendingBet;
      wallet.add(-pendingBet);
      sessionNet -= pendingBet;
      hands = [newHand(pendingBet)];
      active = 0;
      phase = 'play';
      message('');
      renderStack(pendingBet);
      renderAll();
      ui.controls.replaceChildren();

      await dealTo(0);
      await dealTo('dealer');
      await dealTo(0);
      await dealTo('dealer', true);

      const up = dealer[0];
      if (up.rank === 'A') {
        phase = 'insurance';
        message('Dealer zeigt ein Ass – Versicherung?', 'info');
        busy = false;
        renderAll();
        return;
      }
      await afterPeek();
    };

    const resolveInsurance = async (take: boolean) => {
      busy = true;
      if (take) {
        insurance = hands[0].bet / 2;
        wallet.add(-insurance);
        sessionNet -= insurance;
        sfx.chip();
      }
      phase = 'play';
      renderStats();
      await afterPeek();
    };

    /** Dealer schaut bei Ass oder 10 nach Blackjack, danach Spielerzug. */
    const afterPeek = async () => {
      const up = dealer[0];
      const dealerBJ = isBlackjack(dealer);
      if ((up.rank === 'A' || cardValue(up) === 10) && dealerBJ) {
        await revealHole();
        if (insurance) {
          payout(insurance * 3);
          message(`Dealer hat Blackjack – Versicherung zahlt ${fmt(insurance * 3)}`, 'info');
        } else message('Dealer hat Blackjack', 'lose');
        await finishRound();
        return;
      }
      if (insurance) message('Kein Blackjack beim Dealer – Versicherung verloren', 'lose');

      if (isBlackjack(hands[0].cards)) {
        hands[0].done = true;
        await revealHole();
        await finishRound();
        return;
      }
      busy = false;
      renderAll();
    };

    const payout = (amount: number) => {
      if (amount <= 0) return;
      wallet.add(amount);
      sessionNet += amount;
      renderStats();
    };

    const nextHand = async () => {
      hands[active].done = true;
      const next = hands.findIndex((h) => !h.done);
      if (next >= 0) {
        active = next;
        // Split-Hand mit 21 steht automatisch
        if (handValue(hands[active].cards).total === 21) {
          await nextHand();
          return;
        }
        busy = false;
        renderAll();
        return;
      }
      await dealerTurn();
    };

    const hit = async () => {
      busy = true;
      await dealTo(active);
      const { total } = handValue(hands[active].cards);
      if (total > 21) {
        message('Bust!', 'lose');
        sfx.bjLose();
        await wait(500);
        await nextHand();
      } else if (total === 21) {
        await nextHand();
      } else {
        busy = false;
        renderAll();
      }
    };

    const stand = async () => {
      busy = true;
      await nextHand();
    };

    const double = async () => {
      const h = hands[active];
      if (!canDouble(h, wallet.get())) return;
      busy = true;
      wallet.add(-h.bet);
      sessionNet -= h.bet;
      h.bet *= 2;
      h.doubled = true;
      sfx.chip();
      renderStack(hands.reduce((a, x) => a + x.bet, 0));
      renderStats();
      await dealTo(active);
      if (handValue(h.cards).total > 21) {
        message('Bust!', 'lose');
        sfx.bjLose();
        await wait(500);
      }
      await nextHand();
    };

    const split = async () => {
      const h = hands[active];
      if (!canSplit(h, hands.length, wallet.get())) return;
      busy = true;
      wallet.add(-h.bet);
      sessionNet -= h.bet;
      sfx.chip();
      const second = newHand(h.bet, [h.cards.pop()!], true);
      h.fromSplit = true;
      const aces = h.cards[0].rank === 'A';
      hands.splice(active + 1, 0, second);
      renderStack(hands.reduce((a, x) => a + x.bet, 0));
      renderAll();
      await wait(250);
      await dealTo(active);
      await dealTo(active + 1);
      if (aces) {
        // Split-Asse: je nur eine Karte, kein weiteres Teilen
        h.splitAces = second.splitAces = true;
        h.done = second.done = true;
        await dealerTurn();
        return;
      }
      if (handValue(h.cards).total === 21) {
        await nextHand();
        return;
      }
      busy = false;
      renderAll();
    };

    const dealerTurn = async () => {
      busy = true;
      phase = 'dealer';
      renderAll();
      await revealHole();
      const alive = hands.some((h) => handValue(h.cards).total <= 21);
      if (alive) {
        while (dealerShouldHit(dealer)) await dealTo('dealer');
      }
      await finishRound();
    };

    const finishRound = async () => {
      let won = 0;
      let staked = 0;
      for (const h of hands) {
        settle(h, dealer);
        won += h.payout ?? 0;
        staked += h.bet;
      }
      payout(won);
      phase = 'done';
      const d = handValue(dealer).total;
      const net = won - staked - insurance + (insurance && isBlackjack(dealer) ? insurance * 3 : 0);
      if (hands.some((h) => h.outcome === 'blackjack')) {
        message(`Blackjack! +${fmt(won - staked)}`, 'win');
        sfx.win(3);
      } else if (net > 0) {
        message(d > 21 ? `Dealer bust – du gewinnst ${fmt(net)}` : `Gewonnen! +${fmt(net)}`, 'win');
        sfx.win(2);
      } else if (net === 0) {
        message('Push – Einsatz zurück', 'info');
      } else if (!isBlackjack(dealer)) {
        message(`Verloren −${fmt(-net)}`, 'lose');
        sfx.bjLose();
      }
      busy = false;
      renderAll();
    };

    // ─────────────── Eingaben ───────────────

    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      const k = e.key.toLowerCase();
      const click = (label: string) => {
        const b = [...ui.controls.querySelectorAll<HTMLButtonElement>('.bj-btn')].find((x) => x.textContent?.startsWith(label));
        if (b && !b.disabled) {
          e.preventDefault();
          b.click();
        }
      };
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'bet') click('Austeilen');
        else if (phase === 'done') click('Nochmal');
      } else if (phase === 'play') {
        if (k === 'h') click('Karte');
        if (k === 's') click('Halten');
        if (k === 'd') click('Verdoppeln');
        if (k === 'p') click('Teilen');
      }
    };
    addEventListener('keydown', onKey);

    ui.leave.addEventListener('click', () => {
      if (phase !== 'bet' && phase !== 'done') return;
      sfx.uiClick();
      removeEventListener('keydown', onKey);
      resolve(0);
    });

    if (import.meta.env.DEV) {
      // Reihenfolge beim Austeilen: Spieler, Dealer (offen), Spieler, Dealer (verdeckt), danach Nachzieh-Karten
      (window as unknown as { bj: unknown }).bj = { rig: (ranks: string) => shoe.rig(ranks.split(' ') as never) };
    }

    renderStack(0);
    renderAll();
    message(`Mindesteinsatz ${fmt(MIN_BET)} · Setze mit deinem Bankguthaben`, 'info');
  });
}
