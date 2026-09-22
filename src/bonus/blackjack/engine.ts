/**
 * Blackjack nach Vegas-Standard:
 * 6 Decks · Dealer steht auf Soft 17 · Blackjack zahlt 3:2 · Double auf beliebige 2 Karten
 * Split bis 4 Hände · Split-Asse erhalten nur 1 Karte (kein Resplit) · Double nach Split
 * Versicherung bei Dealer-Ass (zahlt 2:1) · Dealer schaut bei Ass/10 auf Blackjack (Hole Card)
 */
import type { Rng } from '../../engine/rng';

export const DECKS = 6;
export const MAX_HANDS = 4;
/** Nach ~75 % des Schlittens wird neu gemischt */
const CUT_CARD = Math.floor(DECKS * 52 * 0.75);

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  rank: Rank;
  suit: Suit;
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function cardValue(c: Card): number {
  if (c.rank === 'A') return 11;
  if (c.rank === 'J' || c.rank === 'Q' || c.rank === 'K') return 10;
  return Number(c.rank);
}

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (cards: Card[]) => cards.length === 2 && handValue(cards).total === 21;

export class Shoe {
  private cards: Card[] = [];
  private dealt = 0;

  constructor(private rng: Rng) {
    this.shuffle();
  }

  get needsShuffle() {
    return this.dealt >= CUT_CARD;
  }

  get remaining() {
    return this.cards.length - this.dealt;
  }

  shuffle() {
    this.cards = [];
    for (let d = 0; d < DECKS; d++) for (const suit of SUITS) for (const rank of RANKS) this.cards.push({ rank, suit });
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    this.dealt = 0;
  }

  /** Nur Dev: legt Karten oben auf den Schlitten */
  rig(ranks: Rank[]) {
    this.cards.splice(this.dealt, 0, ...ranks.map((rank, i) => ({ rank, suit: SUITS[i % 4] })));
  }

  draw(): Card {
    if (this.dealt >= this.cards.length) this.shuffle();
    return this.cards[this.dealt++];
  }
}

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust';

export interface PlayerHand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  done: boolean;
  outcome?: Outcome;
  /** Auszahlung inkl. Einsatz */
  payout?: number;
}

export function newHand(bet: number, cards: Card[] = [], fromSplit = false): PlayerHand {
  return { cards, bet, doubled: false, fromSplit, splitAces: false, done: false };
}

export function canDouble(h: PlayerHand, balance: number): boolean {
  return !h.done && h.cards.length === 2 && !h.splitAces && balance >= h.bet;
}

export function canSplit(h: PlayerHand, handsCount: number, balance: number): boolean {
  return (
    !h.done &&
    h.cards.length === 2 &&
    cardValue(h.cards[0]) === cardValue(h.cards[1]) &&
    handsCount < MAX_HANDS &&
    !h.splitAces &&
    balance >= h.bet
  );
}

/** Dealer zieht bis mindestens 17, steht auf Soft 17. */
export function dealerShouldHit(cards: Card[]): boolean {
  return handValue(cards).total < 17;
}

/** Wertet eine Hand gegen den Dealer aus (Dealer-Blackjack wird vorher separat behandelt). */
export function settle(h: PlayerHand, dealer: Card[]): PlayerHand {
  const p = handValue(h.cards).total;
  const d = handValue(dealer).total;
  // Blackjack nur mit den ersten 2 Karten und nicht nach Split
  if (!h.fromSplit && isBlackjack(h.cards)) {
    h.outcome = isBlackjack(dealer) ? 'push' : 'blackjack';
  } else if (p > 21) h.outcome = 'bust';
  else if (isBlackjack(dealer)) h.outcome = 'lose';
  else if (d > 21 || p > d) h.outcome = 'win';
  else if (p === d) h.outcome = 'push';
  else h.outcome = 'lose';

  h.payout =
    h.outcome === 'blackjack' ? h.bet * 2.5 : h.outcome === 'win' ? h.bet * 2 : h.outcome === 'push' ? h.bet : 0;
  return h;
}
