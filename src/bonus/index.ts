import type { BonusId, SpinResult } from '../engine/slot';
import { playBlackjack } from './blackjack';
import { playPickup } from './pickup';

/**
 * Schnittstelle für Bonusspiele. Jedes Bonusspiel bekommt einen Container
 * und liefert am Ende den Gewinn zurück, der dem Guthaben gutgeschrieben wird.
 */

/** Zugriff auf das Bankguthaben des Spielers */
export interface Wallet {
  get(): number;
  add(amount: number): void;
}

export interface BonusContext {
  bet: number;
  wallet: Wallet;
  trigger: SpinResult;
  /** Vollbild-Container für die Bonus-UI */
  stage: HTMLElement;
}

export interface BonusGame {
  id: BonusId;
  title: string;
  tagline: string;
  theme: 'gold' | 'coup';
  play(ctx: BonusContext): Promise<number>;
}

export const BONUS_GAMES: Record<BonusId, BonusGame> = {
  golden: {
    id: 'golden',
    title: 'GOLDEN MASK',
    tagline: '3+ Goldmasken – spiel eine Runde Pick-Up: drehe, sammle Felder, kassiere Punkte!',
    theme: 'gold',
    play: playPickup,
  },
  coup: {
    id: 'coup',
    title: 'COUP',
    tagline: 'Die Crew wartet am Blackjack-Tisch – schlag den Dealer mit deinem Bankguthaben!',
    theme: 'coup',
    play: playBlackjack,
  },
};
