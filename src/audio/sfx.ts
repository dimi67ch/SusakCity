/**
 * Synthetisierte Sounds per Web Audio API – keine Audiodateien nötig.
 */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private riser: { stop: () => void } | null = null;
  private keepAlive: HTMLAudioElement | null = null;
  private lastStop = 0;
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
      const el = document.createElement('audio');
      el.src =
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';
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
