export class FloatingText {
  public text: string;
  public x: number;
  public y: number;
  public color: string;
  public alpha: number = 1.0;
  public vy: number = -1.2;
  public life: number = 50;

  constructor(text: string, x: number, y: number, color: string) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
  }

  update() {
    this.y += this.vy;
    this.alpha = Math.max(0, this.alpha - 1/50);
    this.life--;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.font = 'bold 16px monospace';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class Projectile {
  public x: number;
  public y: number;
  public tx: number;
  public ty: number;
  public color: string;
  public onHit: () => void;
  public speed: number = 13;
  public dead: boolean = false;

  constructor(sx: number, sy: number, tx: number, ty: number, color: string, onHitCallback: () => void) {
    this.x = sx;
    this.y = sy;
    this.tx = tx;
    this.ty = ty;
    this.color = color;
    this.onHit = onHitCallback;
  }

  update() {
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.speed) {
      this.x = this.tx;
      this.y = this.ty;
      this.dead = true;
      this.onHit();
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class VisualParticle {
  public x: number;
  public y: number;
  public color: string;
  public vx: number;
  public vy: number;
  public alpha: number = 1.0;
  public life: number = 20;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = (Math.random() - 0.5) * 5;
    this.vy = (Math.random() - 0.5) * 5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha = Math.max(0, this.alpha - 1/20);
    this.life--;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
