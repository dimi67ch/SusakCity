interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  sprite: HTMLCanvasElement;
  kind: 'spark' | 'coin' | 'bill';
  rot: number;
  vr: number;
}

const COLORS = ['#ff2e88', '#00e5ff', '#ffd84d', '#8b5cf6', '#ff8a3d', '#3dffa8'];
const MAX_PARTICLES = 380;
const SPRITE = 64;

/** Glow-Sprites einmalig vorrendern – drawImage ist um ein Vielfaches billiger als shadowBlur. */
function makeSprite(draw: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = SPRITE;
  const c = cv.getContext('2d')!;
  c.translate(SPRITE / 2, SPRITE / 2);
  draw(c);
  return cv;
}

const sparkSprites = COLORS.map((color) =>
  makeSprite((c) => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, SPRITE / 2);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.15, color);
    g.addColorStop(0.4, color + '66');
    g.addColorStop(1, color + '00');
    c.fillStyle = g;
    c.fillRect(-SPRITE / 2, -SPRITE / 2, SPRITE, SPRITE);
  }),
);

const coinSprite = makeSprite((c) => {
  c.shadowColor = '#ffd84d';
  c.shadowBlur = 10;
  const g = c.createLinearGradient(0, -18, 0, 18);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.5, '#ffd84d');
  g.addColorStop(1, '#c98a00');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, 18, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;
  c.fillStyle = '#7a4b00';
  c.font = 'bold 24px Anton, Impact, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('$', 0, 1);
});

const billSprite = makeSprite((c) => {
  c.shadowColor = '#3dffa8';
  c.shadowBlur = 8;
  c.fillStyle = '#3dffa8';
  c.fillRect(-24, -12, 48, 24);
  c.shadowBlur = 0;
  c.fillStyle = '#0b3d25';
  c.fillRect(-7, -7, 14, 14);
  c.strokeStyle = '#0b3d25';
  c.strokeRect(-21, -9, 42, 18);
});

/** Leichtgewichtiges Canvas-Partikelsystem für Gewinne und Boni. */
export class Particles {
  private ctx: CanvasRenderingContext2D;
  private ps: P[] = [];
  private running = false;
  private fountain = 0;
  private dpr = Math.min(1.5, window.devicePixelRatio || 1);

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    const resize = () => {
      canvas.width = innerWidth * this.dpr;
      canvas.height = innerHeight * this.dpr;
    };
    resize();
    addEventListener('resize', resize);
  }

  burst(x: number, y: number, n = 60, kinds: P['kind'][] = ['spark']) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 9;
      this.add(this.make(x, y, Math.cos(a) * s, Math.sin(a) * s - 3, kinds));
    }
    this.start();
  }

  /** Dauerregen von oben (Big Win), bis stopFountain(). */
  startFountain(intensity = 1) {
    this.fountain = intensity;
    this.start();
  }

  stopFountain() {
    this.fountain = 0;
  }

  private add(p: P) {
    if (this.ps.length < MAX_PARTICLES) this.ps.push(p);
  }

  private make(x: number, y: number, vx: number, vy: number, kinds: P['kind'][]): P {
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    return {
      x, y, vx, vy,
      life: 70 + Math.random() * 60,
      size: kind === 'spark' ? 10 + Math.random() * 14 : 16 + Math.random() * 12,
      sprite: kind === 'coin' ? coinSprite : kind === 'bill' ? billSprite : sparkSprites[Math.floor(Math.random() * sparkSprites.length)],
      kind,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    };
  }

  private start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.loop);
  }

  private loop = () => {
    const { ctx } = this;
    const w = innerWidth;
    const h = innerHeight;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (this.fountain) {
      const n = Math.round(2 * this.fountain);
      for (let i = 0; i < n; i++) {
        this.add(this.make(Math.random() * w, -20, (Math.random() - 0.5) * 3, 2 + Math.random() * 4, ['coin', 'bill', 'spark']));
        const left = Math.random() < 0.5;
        this.add(this.make(left ? 0 : w, h * 0.9, (left ? 1 : -1) * (6 + Math.random() * 8), -12 - Math.random() * 8, ['spark', 'coin']));
      }
    }

    ctx.globalCompositeOperation = 'lighter';
    let alive = 0;
    for (const p of this.ps) {
      p.life--;
      p.vy += p.kind === 'spark' ? 0.18 : 0.12;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.life <= 0 || p.y > h + 40) continue;
      this.ps[alive++] = p;

      ctx.globalAlpha = Math.min(1, p.life / 30);
      const s = p.size;
      if (p.kind === 'spark') {
        ctx.drawImage(p.sprite, p.x - s / 2, p.y - s / 2, s, s);
      } else {
        const sx = p.kind === 'coin' ? Math.abs(Math.cos(p.rot * 3)) + 0.15 : 1;
        const cos = Math.cos(p.rot);
        const sin = Math.sin(p.rot);
        ctx.setTransform(cos * sx * this.dpr, sin * sx * this.dpr, -sin * this.dpr, cos * this.dpr, p.x * this.dpr, p.y * this.dpr);
        ctx.drawImage(p.sprite, -s / 2, -s / 2, s, s);
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }
    }
    this.ps.length = alive;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (this.ps.length || this.fountain) requestAnimationFrame(this.loop);
    else {
      ctx.clearRect(0, 0, w, h);
      this.running = false;
    }
  };
}
