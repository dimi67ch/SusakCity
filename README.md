# Susak City – Neon Slot

5×5-Slot-Maschine im Neon-Night-Look (reines Frontend, Vite + TypeScript, Spielgeld).

```bash
npm install
npm run dev        # Dev-Server
npm run build      # Produktions-Build nach dist/
npm run simulate   # RTP-Simulation (Standard: 2 Mio. Spins)
```

## Spielregeln

| | |
|---|---|
| Raster | 5 Walzen × 5 Reihen |
| Linien | 5 (Reihe 2, 3, 4 · V · Λ), links → rechts, ab 3 gleichen |
| Symbole | 11: Vape, Vorschlaghammer, Boxhandschuhe, Honigglas, Königskette, Audi · Wild · Scatter · Ass + 2 Crew-Porträts |
| Wild | Expanding Wild auf Walze 2–4, dehnt sich aus, wenn es zu einem Gewinn beiträgt |
| Scatter | Goldmaske, zahlt 2× / 10× / 50× Einsatz, ab 3 → **GOLDEN-MASK-Bonus** |
| Coup | Ass + beide Crew-Porträts gleichzeitig sichtbar → **COUP-Bonus**: echtes Blackjack (Vegas-Regeln) mit dem Bankguthaben |
| Golden Mask | 3+ Scatter → **Pick-Up**: 5 Einzelwalzen, max. 3 Spins pro Zug (Walzen sperrbar), 12 Felder einlösen, Gewinn = Punkte × Einsatz (Ø ≈ 13×) |
| Einsatz | $10 – $1.000, Startguthaben $10.000 (localStorage) |

Basisspiel-RTP ≈ 95,4 %, Trefferquote ≈ 28 %, Golden Mask ≈ 1/170, Coup ≈ 1/270 Spins (ohne Bonusspiele).

## Projektstruktur

```
src/
  config/     symbols.ts (Symbole), game.ts (Linien, Gewinntabelle, Walzen-Gewichte, Timing)
  engine/     slot.ts (Auswertung, Expanding Wild, Trigger), strips.ts, rng.ts
  ui/         reels.ts (Walzen-Animation), winPresenter.ts, overlays.ts, particles.ts, background.ts
  audio/      sfx.ts (synthetisierte Web-Audio-Sounds)
  bonus/      index.ts (Bonusspiel-Schnittstelle + Platzhalter)
  game.ts     Spielablauf / Steuerung
scripts/simulate.ts
```

## Eigene Symbolgrafiken

Standardmäßig werden die Neon-SVG-Icons aus `src/ui/icons.ts` gezeichnet. Datei mit der Symbol-ID als Namen in `src/assets/symbols/` ablegen, z. B. `audi.png`, `wild.webp`,
`scatter.svg`. Sie wird automatisch statt des Icons verwendet.
IDs: `vape hammer gloves honey chain audi wild scatter ace don playboy`.
Empfohlen: quadratisch, transparent, ≥ 256 px.

## Bonusspiele einbauen

`src/bonus/index.ts` – `BONUS_GAMES.golden` / `BONUS_GAMES.coup` (Blackjack, `src/bonus/blackjack/`) durch eine eigene
`BonusGame`-Implementierung ersetzen. `play({ bet, trigger, stage })` rendert in `stage` und
liefert den Gewinn als Promise zurück.

## Debug (nur `npm run dev`)

Oben links erscheint eine **DEV-Leiste**: Pick-Up · Blackjack · Big Win · Wild · +$10k
(auch per `Strg`+`1`…`5`). Ein Klick dreht sofort mit dem passenden Raster.

Alternativ in der Browser-Konsole: `susak.force('bigwin' | 'wild' | 'golden' | 'coup')`, dann drehen.
`susak.balance(5000)` setzt das Guthaben.
Am Blackjack-Tisch: `bj.rig('8 A 8 K 3 10')` legt die nächsten Karten fest (Spieler, Dealer offen, Spieler, Dealer verdeckt, …).
