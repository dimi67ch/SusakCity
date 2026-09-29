import noticeUrl from '../assets/audio/gluecksspiel-hinweis.mp3';
import welcomeUrl from '../assets/audio/herzlich-willkommen.mp3';
import welcomeCasinoUrl from '../assets/audio/willkommen-susak-casino.mp3';
import bigWinUrl from '../assets/audio/lanlanlan.mp3';
import pickupUrl from '../assets/audio/pick-me-up.mp3';
import blackjackUrl from '../assets/audio/auf-gehts-maenner.mp3';
import blackjackLeaveUrl from '../assets/audio/ee-susak.mp3';
import pickupDoneUrl from '../assets/audio/jawohl-junge.mp3';

/** Sprachaufnahmen – alle über denselben Weg und auf dieselbe Lautheit gebracht */
const VOICES = {
  notice: noticeUrl,
  welcome: welcomeUrl,
  welcomeCasino: welcomeCasinoUrl,
  bigWin: bigWinUrl,
  pickup: pickupUrl,
  blackjack: blackjackUrl,
  blackjackLeave: blackjackLeaveUrl,
  pickupDone: pickupDoneUrl,
};
export type VoiceId = keyof typeof VOICES;

/** Ziel-Lautheit aller Sprachaufnahmen (RMS der hörbaren Teile, dBFS). Kleiner = leiser. */
const VOICE_LEVEL_DB = -14;

/** Dateien schon vor dem Start-Klick laden – dekodiert wird erst mit dem Audio-Kontext */
const voiceData = Object.fromEntries(
  Object.entries(VOICES).map(([id, url]) => [id, fetch(url).then((r) => r.arrayBuffer())]),
) as Record<VoiceId, Promise<ArrayBuffer>>;

/** Verstärkung, die eine Aufnahme auf VOICE_LEVEL_DB bringt (Stille wird ignoriert, nie übersteuert). */
function levelGain(buf: AudioBuffer): number {
  const win = Math.floor(buf.sampleRate * 0.05);
  let sum = 0;
  let n = 0;
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i + win <= d.length; i += win) {
      let s = 0;
      for (let j = i; j < i + win; j++) {
        s += d[j] * d[j];
        peak = Math.max(peak, Math.abs(d[j]));
      }
      if (Math.sqrt(s / win) > 0.003) {
        sum += s;
        n += win;
      }
    }
  }
  if (!n) return 1;
  const rms = Math.sqrt(sum / n);
  return Math.min(10 ** (VOICE_LEVEL_DB / 20) / rms, 0.98 / peak);
}

/** 1 s Stille als WAV (8 kHz, 8 Bit, mono) – für das iOS-Keep-Alive-Element. */
function silentWavUrl(): string {
  const rate = 8000;
  const n = rate;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, n, true);
  new Uint8Array(buf, 44).fill(128); // 8-Bit-Stille
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

/**
 * Synthetisierte Sounds per Web Audio API – plus Sprachaufnahmen, die über denselben
 * Kontext laufen und damit die iOS-Freischaltung teilen.
 */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  /** Eigener Weg für Sprache: am Kompressor der Effekte vorbei, damit alle gleich laut bleiben */
  private voiceBus: GainNode | null = null;
  private voices: Partial<Record<VoiceId, Promise<{ buf: AudioBuffer; gain: number } | null>>> = {};
  private loadedVoices: Partial<Record<VoiceId, { buf: AudioBuffer; gain: number }>> = {};
  private riser: { stop: () => void } | null = null;
  private keepAlive: HTMLAudioElement | null = null;
  private lastStop = 0;
  /** Kontextzeit, zu der der Big-Win-Jingle ausklingt */
  private bigWinEnd = 0;
  muted = localStorage.getItem('susak.muted') === '1';

  /**
   * Muss aus einer User-Geste heraus aufgerufen werden.
   * iOS braucht zusätzlich einen kurz abgespielten Puffer und ein <audio>-Element,
   * damit der Ton auch im Home-Bildschirm-Modus und bei aktivem Stummschalter läuft.
   */
  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // Kontext nach Hintergrund/Anruf automatisch wieder aufwecken
      this.ctx.addEventListener('statechange', () => this.resume());
      for (const ev of ['visibilitychange', 'focus', 'pageshow', 'pointerdown', 'touchend'] as const) {
        addEventListener(ev, () => this.resume(), { passive: true });
      }
      this.voiceBus = this.ctx.createGain();
      this.voiceBus.gain.value = this.muted ? 0 : 1;
      this.voiceBus.connect(this.ctx.destination);
      for (const id of Object.keys(VOICES) as VoiceId[]) {
        this.voices[id] = voiceData[id]
          .then((data) => this.ctx!.decodeAudioData(data))
          .then((buf) => (this.loadedVoices[id] = { buf, gain: levelGain(buf) }))
          .catch(() => null);
      }
    }
    this.primeSilent();
    this.resume();
  }

  /** Stille Wiedergabe hält die Audio-Session auf iOS aktiv. */
  private primeSilent() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start(0);

    if (!this.keepAlive) {
      // Kurzer stiller WAV-Loop: schaltet iOS auf die Wiedergabe-Session um,
      // damit Web Audio nicht vom Stummschalter unterdrückt wird.
      // Wichtig: echte Länge (1 s). Ein Loop über eine WAV ohne Samples startet
      // endlos sofort neu und blockiert den Haupt-Thread komplett.
      const el = document.createElement('audio');
      el.src = silentWavUrl();
      el.loop = true;
      el.volume = 0.001;
      el.setAttribute('playsinline', '');
      el.setAttribute('aria-hidden', 'true');
      el.style.display = 'none';
      document.body.append(el);
      this.keepAlive = el;
    }
    void this.keepAlive.play().catch(() => undefined);
  }

  /** Startet eine geladene Aufnahme frühestens zur Kontextzeit `at`; liefert Endzeit und Ende-Promise. */
  private startVoice(id: VoiceId, { force = false, at = 0 } = {}) {
    const v = this.loadedVoices[id];
    const ctx = this.ctx;
    if (!v || !ctx) return null;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = v.buf;
    g.gain.value = v.gain;
    // force: Pflichthinweis – spielt auch bei stummgeschaltetem Spiel
    src.connect(g).connect(force ? ctx.destination : this.voiceBus!);
    const t = Math.max(ctx.currentTime, at);
    const done = new Promise<void>((r) => (src.onended = () => r()));
    src.start(t);
    return { end: t + v.buf.duration, done };
  }

  /**
   * Spielt eine Sprachaufnahme ab, sobald sie geladen ist; löst auf, wenn sie zu Ende ist
   * (oder sofort, falls sie nicht abgespielt werden kann).
   */
  async voice(id: VoiceId, opts: { force?: boolean } = {}): Promise<void> {
    if (this.muted && !opts.force) return;
    await this.voices[id];
    if (this.ctx && this.ctx.state !== 'running') await this.ctx.resume().catch(() => undefined);
    await this.startVoice(id, opts)?.done;
  }

  /** „Pick me up" beim Betreten der Pick-Up-Walzen. */
  pickupIntro() {
    if (this.ready) this.startVoice('pickup');
  }

  /** „Auf geht's, Männer" beim Platznehmen am Blackjack-Tisch. */
  blackjackIntro() {
    if (this.ready) this.startVoice('blackjack');
  }

  /** „Ee Susak" beim Verlassen des Blackjack-Tischs. */
  blackjackLeave() {
    if (this.ready) this.startVoice('blackjackLeave');
  }

  /** „Jawohl Junge" nach dem Pick-Up-Bonus – wartet, falls noch der Big-Win-Jingle läuft. */
  pickupDone() {
    if (this.ready) this.startVoice('pickupDone', { at: this.bigWinEnd });
  }

  /** Setzt einen angehaltenen oder unterbrochenen Kontext fort. */
  resume() {
    if (!this.ctx) return;
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
    void this.keepAlive?.play().catch(() => undefined);
  }

  /** true, wenn wirklich Ton ausgegeben werden kann */
  get active() {
    return this.ctx?.state === 'running';
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (!m) this.resume();
    localStorage.setItem('susak.muted', m ? '1' : '0');
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.02);
    if (this.voiceBus && this.ctx) this.voiceBus.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  private get ready() {
    return this.ctx && this.master && this.ctx.state === 'running';
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slideTo?: number; attack?: number } = {}) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (opts.at ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    const vol = opts.vol ?? 0.3;
    const a = opts.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(dur: number, opts: { freq?: number; q?: number; vol?: number; at?: number; type?: BiquadFilterType; sweepTo?: number } = {}) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (opts.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 2000, t);
    if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.3, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  uiClick() {
    if (!this.ready) return;
    this.tone(1800, 0.04, { type: 'triangle', vol: 0.12 });
  }

  spinStart() {
    if (!this.ready) return;
    this.noise(0.35, { freq: 400, sweepTo: 3000, q: 0.8, vol: 0.18 });
    this.tone(120, 0.25, { type: 'sawtooth', vol: 0.05, slideTo: 260 });
  }

  /** Mechanischer Einrastton, leicht variiert je Walze. */
  reelStop(reel: number) {
    if (!this.ready) return;
    const now = performance.now();
    const quiet = now - this.lastStop < 40; // bei Slam-Stop nicht aufaddieren
    this.lastStop = now;
    const v = quiet ? 0.4 : 1;
    this.noise(0.05, { freq: 2600 + reel * 120, q: 3, vol: 0.35 * v });
    this.tone(150 - reel * 6, 0.12, { type: 'sine', vol: 0.45 * v, slideTo: 55 });
    this.tone(900 + reel * 40, 0.03, { type: 'square', vol: 0.05 * v });
  }

  scatterLand(n: number) {
    if (!this.ready) return;
    const base = 660 * Math.pow(2, (n - 1) * (4 / 12));
    [1, 2, 3.01].forEach((h, i) => this.tone(base * h, 0.9 - i * 0.2, { vol: 0.16 / (i + 1), type: 'sine' }));
    this.tone(base * 1.5, 0.5, { vol: 0.08, type: 'triangle', at: 0.06 });
  }

  heistLand(n: number) {
    if (!this.ready) return;
    const base = 196 * Math.pow(2, (n - 1) * (3 / 12));
    this.tone(base, 0.4, { type: 'sawtooth', vol: 0.12, slideTo: base * 0.98 });
    this.tone(base * 2, 0.25, { type: 'square', vol: 0.05 });
    this.noise(0.08, { freq: 800, q: 2, vol: 0.15 });
  }

  startAnticipation() {
    if (!this.ready || this.riser) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 4);
    osc2.frequency.setValueAtTime(111.5, t);
    osc2.frequency.exponentialRampToValueAtTime(443, t + 4);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(4000, t + 4);
    f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.4);
    osc.connect(f);
    osc2.connect(f);
    f.connect(g).connect(this.master!);
    osc.start(t);
    osc2.start(t);
    this.riser = {
      stop: () => {
        const n = ctx.currentTime;
        g.gain.cancelScheduledValues(n);
        g.gain.setTargetAtTime(0.0001, n, 0.05);
        osc.stop(n + 0.3);
        osc2.stop(n + 0.3);
      },
    };
  }

  stopAnticipation() {
    this.riser?.stop();
    this.riser = null;
  }

  expand() {
    if (!this.ready) return;
    this.noise(0.5, { freq: 300, sweepTo: 6000, q: 1.5, vol: 0.2 });
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.08, at: i * 0.05 }));
  }

  /** level 0 = klein … 3 = groß */
  win(level: number) {
    if (!this.ready) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
    const count = 3 + level;
    for (let i = 0; i < count; i++) {
      const f = notes[i % notes.length] * (i >= notes.length ? 2 : 1);
      this.tone(f, 0.28, { type: 'triangle', vol: 0.14, at: i * 0.07 });
      this.tone(f * 2, 0.18, { type: 'sine', vol: 0.05, at: i * 0.07 });
    }
  }

  countTick() {
    if (!this.ready) return;
    this.tone(2200 + Math.random() * 400, 0.025, { type: 'square', vol: 0.03 });
  }

  bigWin() {
    if (!this.ready) return;
    const jingle = this.startVoice('bigWin');
    if (jingle) {
      this.bigWinEnd = jingle.end;
      return;
    }
    // Fallback, solange der Jingle noch nicht dekodiert ist
    const chords = [
      [261.6, 329.6, 392],
      [293.7, 370, 440],
      [329.6, 415.3, 493.9],
      [392, 493.9, 587.3, 784],
    ];
    chords.forEach((c, i) =>
      c.forEach((f) => {
        this.tone(f, i === 3 ? 1.6 : 0.3, { type: 'sawtooth', vol: 0.05, at: i * 0.16 });
        this.tone(f * 2, i === 3 ? 1.4 : 0.25, { type: 'triangle', vol: 0.06, at: i * 0.16 });
      }),
    );
    this.noise(1.2, { freq: 8000, type: 'highpass', vol: 0.06, at: 0.48 });
  }

  tierUp() {
    if (!this.ready) return;
    this.noise(0.4, { freq: 500, sweepTo: 5000, vol: 0.18 });
    [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.1, at: i * 0.04 }));
  }

  /** Goldener Gong mit Glitzer-Arpeggio (Golden-Mask-Bonus). */
  gong() {
    if (!this.ready) return;
    // Unharmonische Teiltöne ergeben den metallischen Gong-Klang
    [1, 1.47, 2.09, 2.56, 3.43].forEach((h, i) => this.tone(98 * h, 2.6 - i * 0.35, { type: 'sine', vol: 0.22 / (i + 1), attack: 0.01 }));
    this.tone(49, 1.8, { type: 'sine', vol: 0.35, slideTo: 44 });
    this.noise(0.25, { freq: 3000, q: 0.7, vol: 0.12 });
    [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: 0.06, at: 0.35 + i * 0.08 }));
  }

  /** Karte vom Schlitten ziehen */
  cardDeal() {
    if (!this.ready) return;
    this.noise(0.09, { freq: 3500, sweepTo: 1800, q: 0.6, vol: 0.22 });
    this.noise(0.03, { freq: 1200, q: 2, vol: 0.12, at: 0.07 });
  }

  cardFlip() {
    if (!this.ready) return;
    this.noise(0.06, { freq: 2500, q: 1, vol: 0.2 });
    this.tone(700, 0.05, { type: 'triangle', vol: 0.05, at: 0.03 });
  }

  /** Chips klackern */
  chip() {
    if (!this.ready) return;
    [0, 0.045, 0.08].forEach((at, i) => {
      this.tone(3200 - i * 300, 0.03, { type: 'square', vol: 0.05, at });
      this.noise(0.025, { freq: 5000, q: 3, vol: 0.12, at });
    });
  }

  bjLose() {
    if (!this.ready) return;
    this.tone(220, 0.35, { type: 'triangle', vol: 0.12, slideTo: 150 });
    this.tone(165, 0.45, { type: 'triangle', vol: 0.1, at: 0.15, slideTo: 110 });
  }

  heistStinger() {
    if (!this.ready) return;
    this.tone(55, 1.2, { type: 'sine', vol: 0.5, slideTo: 35 });
    this.noise(0.6, { freq: 200, type: 'lowpass', vol: 0.3 });
    [146.8, 174.6, 220, 293.7].forEach((f, i) => this.tone(f, 0.9, { type: 'sawtooth', vol: 0.06, at: 0.1 + i * 0.09 }));
  }
}

export const sfx = new Sfx();
