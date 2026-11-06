import { Card } from "../types";
import { FACTIONS, getBaseStats } from "../constants";

const artImageCache = new Map<string, HTMLImageElement>();

export class VisualCard {
  public id: string;
  public name: string;
  public faction: string;
  public attack: number;
  public baseAttack: number;
  public hp: number;
  public maxHp: number;
  public baseMaxHp: number;
  public costDelay: number;
  public currentDelay: number;
  public ability: Card['ability'];
  public abilities: string[] | undefined;
  public dead: boolean;
  public statuses: Card['statuses'] = [];
  public cardArtUrl: string | null = null;

  public x: number;
  public y: number;
  public targetX: number;
  public targetY: number;
  public w: number = 90;
  public h: number = 126;
  public targetW: number = 90;
  public targetH: number = 126;

  public alpha: number = 1.0;
  public targetAlpha: number = 1.0;
  public offsetY: number = 0;
  public targetOffsetY: number = 0;
  public scale: number = 1.0;
  public targetScale: number = 1.0;
  public shakeTimer: number = 0;

  constructor(cardData: Card, startX: number, startY: number) {
    this.id = cardData.id;
    this.name = cardData.name;
    this.faction = cardData.faction;
    this.attack = cardData.attack;
    this.baseAttack = cardData.baseAttack ?? getBaseStats(cardData.name).baseAttack;
    this.hp = cardData.hp;
    this.maxHp = cardData.maxHp;
    this.baseMaxHp = cardData.baseMaxHp ?? getBaseStats(cardData.name).baseMaxHealth;
    this.costDelay = cardData.costDelay;
    this.currentDelay = cardData.currentDelay;
    this.ability = cardData.ability;
    this.abilities = cardData.abilities;
    this.dead = cardData.dead || false;
    this.statuses = cardData.statuses || [];
    this.cardArtUrl = cardData.cardArtUrl || null;

    if (this.cardArtUrl && !artImageCache.has(this.cardArtUrl)) {
      const img = new Image();
      img.src = this.cardArtUrl;
      artImageCache.set(this.cardArtUrl, img);
    }

    this.x = startX;
    this.y = startY;
    this.targetX = startX;
    this.targetY = startY;
  }

  public getAbilityText(): string {
    if (this.abilities && this.abilities.length > 0) {
      return this.abilities.map(a => {
        if (a === "Regenerate 1") return "[Regen 1]";
        return `[${a}]`;
      }).join(" ");
    }
    if (this.id.includes("vine_wall")) {
      return "[Taunt] [Regen 1]";
    }
    if (this.id.includes("castle_wall")) {
      return "[Taunt]";
    }
    if (!this.ability) return "";
    if (this.ability.type === "Paladin") {
      const v1 = this.ability.value ?? 1;
      const v2 = (this.ability as any).value2 ?? 1;
      return `[Block ${v1}] [Heal ${v2}]`;
    }
    if (this.ability.type) {
      return `[${this.ability.type}${this.ability.value !== undefined ? ' ' + this.ability.value : ''}]`;
    }
    return "";
  }

  public update() {
    this.x += (this.targetX - this.x) * 0.16;
    this.y += (this.targetY - this.y) * 0.16;
    this.w += (this.targetW - this.w) * 0.16;
    this.h += (this.targetH - this.h) * 0.16;
    this.alpha += (this.targetAlpha - this.alpha) * 0.12;
    this.offsetY += (this.targetOffsetY - this.offsetY) * 0.2;
    this.scale += (this.targetScale - this.scale) * 0.15;

    if (this.shakeTimer > 0) {
      this.shakeTimer--;
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;

    const drawX = this.x + (this.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0);
    const drawY = this.y + this.offsetY + (this.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0);

    // Centered scaling transformations
    ctx.translate(drawX + this.w / 2, drawY + this.h / 2);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-(this.w / 2), -(this.h / 2));

    const uppercaseFaction = this.faction.toUpperCase();
    const factionInfo = FACTIONS[uppercaseFaction] || FACTIONS.NEUTRAL;
    const scaleF = this.w / 90;

    // 1. Card Container Base Slate
    ctx.fillStyle = '#0a0d14'; // ultra-dark obsidian blue
    ctx.beginPath();
    // @ts-ignore - roundRect is available in modern browsers but type bindings might complain
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(0, 0, this.w, this.h, 10 * scaleF);
    } else {
      ctx.rect(0, 0, this.w, this.h);
    }
    ctx.fill();

    // 2. Glowing Borders / Fire Ambience Shadows & Status Auras
    if (!this.dead && this.statuses && this.statuses.includes('frozen')) {
      ctx.shadowColor = '#06b6d4'; // Cyan
      ctx.shadowBlur = (12 + Math.sin(Date.now() / 150) * 4) * scaleF;
    } else if (!this.dead && this.statuses && this.statuses.includes('burning')) {
      ctx.shadowColor = '#ea580c'; // Intense orange/red
      ctx.shadowBlur = (12 + Math.sin(Date.now() / 120) * 5) * scaleF;
    } else if (!this.dead && this.statuses && this.statuses.includes('poison')) {
      ctx.shadowColor = '#22c55e'; // Emerald green
      ctx.shadowBlur = (12 + Math.sin(Date.now() / 180) * 4) * scaleF;
    } else if ((this.faction.toUpperCase() === 'FIRE' || this.faction.toUpperCase() === 'RED') && !this.dead) {
      const pulse = 8 + Math.sin(Date.now() / 200) * 5;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = pulse * scaleF;
    } else if (this.currentDelay === 0 && !this.dead) {
      ctx.shadowColor = factionInfo.glow;
      ctx.shadowBlur = 10 * scaleF;
    } else {
      ctx.shadowBlur = 0;
    }

    // Faction colored crisp border
    ctx.strokeStyle = factionInfo.color;
    ctx.lineWidth = 2.0 * scaleF;
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(0, 0, this.w, this.h, 10 * scaleF);
    } else {
      ctx.rect(0, 0, this.w, this.h);
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow for inner structures

    // Faint golden inner bezel frame
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
    ctx.lineWidth = 1 * scaleF;
    ctx.strokeRect(3 * scaleF, 3 * scaleF, this.w - 6 * scaleF, this.h - 6 * scaleF);

    // 3. Faction Banner Plate Header
    const bannerGrad = ctx.createLinearGradient(0, 0, 0, 24 * scaleF);
    bannerGrad.addColorStop(0, factionInfo.base);
    bannerGrad.addColorStop(1, '#0e1118');
    ctx.fillStyle = bannerGrad;
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(4 * scaleF, 4 * scaleF, this.w - 8 * scaleF, 20 * scaleF, [6 * scaleF, 6 * scaleF, 0, 0]);
    } else {
      ctx.rect(4 * scaleF, 4 * scaleF, this.w - 8 * scaleF, 20 * scaleF);
    }
    ctx.fill();

    // 4. Central Portrait Illustration Box (Slid directly up to flush-fit under title bar)
    const portraitY = 24 * scaleF;
    const portraitH = 48 * scaleF;
    const portraitW = this.w - 12 * scaleF;
    const portraitX = 6 * scaleF;

    // Portrait abstract mystical gradient backing
    const portraitGrad = ctx.createRadialGradient(
      portraitX + portraitW/2, portraitY + portraitH/2, 2 * scaleF,
      portraitX + portraitW/2, portraitY + portraitH/2, portraitW/2
    );
    portraitGrad.addColorStop(0, factionInfo.color + '44');
    portraitGrad.addColorStop(1, '#040609');
    ctx.fillStyle = portraitGrad;
    ctx.fillRect(portraitX, portraitY, portraitW, portraitH);

    // Portrait metallic outer rim
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)'; // elegant gold line
    ctx.lineWidth = 1.2 * scaleF;
    ctx.strokeRect(portraitX, portraitY, portraitW, portraitH);

    // Character artwork or big icon emblem centered
    const cachedImg = this.cardArtUrl ? artImageCache.get(this.cardArtUrl) : null;
    if (cachedImg && cachedImg.complete && cachedImg.naturalWidth !== 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(portraitX, portraitY, portraitW, portraitH);
      ctx.clip();
      const imgRatio = cachedImg.naturalWidth / cachedImg.naturalHeight;
      const boxRatio = portraitW / portraitH;
      let renderW = portraitW;
      let renderH = portraitH;
      let renderX = portraitX;
      let renderY = portraitY;
      if (imgRatio > boxRatio) {
        renderW = portraitH * imgRatio;
        renderX = portraitX - (renderW - portraitW) / 2;
      } else {
        renderH = portraitW / imgRatio;
        renderY = portraitY - (renderH - portraitH) / 2;
      }
      ctx.drawImage(cachedImg, renderX, renderY, renderW, renderH);
      ctx.restore();
    } else {
      ctx.font = Math.max(16, Math.round(22 * scaleF)) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(factionInfo.emoji, this.w/2, portraitY + portraitH * 0.65);
      ctx.textAlign = 'left';
    }

    // 4b. Draw Status Pill Badges on the portrait area
    if (this.statuses && this.statuses.length > 0 && !this.dead) {
      let badgeX = portraitX + 4 * scaleF;
      const badgeY = portraitY + 4 * scaleF;
      const badgeH = 10 * scaleF;
      const badgeW = 21 * scaleF;
      const spacing = 3 * scaleF;

      ctx.save();
      this.statuses.forEach((status) => {
        let badgeColor = '#64748b';
        let badgeText = '';
        if (status === 'poison') {
          badgeColor = '#10b981'; // Emerald
          badgeText = 'POIS';
        } else if (status === 'burning') {
          badgeColor = '#f97316'; // Orange
          badgeText = 'BURN';
        } else if (status === 'frozen') {
          badgeColor = '#06b6d4'; // Cyan
          badgeText = 'FROZ';
        }

        ctx.fillStyle = badgeColor;
        ctx.beginPath();
        // @ts-ignore
        if (ctx.roundRect) {
          // @ts-ignore
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 2.5 * scaleF);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.max(4.5, Math.round(5.5 * scaleF)) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH - 3 * scaleF);
        
        badgeX += badgeW + spacing;
      });
      ctx.restore();
    }

    // 5. Name Plate & Delay Status Badge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(8 * scaleF, 6 * scaleF, this.w - 16 * scaleF, 16 * scaleF, 3 * scaleF);
    } else {
      ctx.rect(8 * scaleF, 6 * scaleF, this.w - 16 * scaleF, 16 * scaleF);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    // Name text layout
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.max(7, Math.round(9 * scaleF)) + 'px monospace';
    const displayName = this.name.length > 10 ? this.name.split(' ')[0] : this.name;
    ctx.fillText(displayName, 12 * scaleF, 18 * scaleF);

    // Delay status dynamic indicator (Top Right of plate)
    if (this.currentDelay > 0) {
      ctx.fillStyle = '#f59e0b'; // Amber wait warning
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(this.w - 22 * scaleF, 8 * scaleF, 12 * scaleF, 12 * scaleF, 2 * scaleF);
      } else {
        ctx.rect(this.w - 22 * scaleF, 8 * scaleF, 12 * scaleF, 12 * scaleF);
      }
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.font = 'bold ' + Math.max(6, Math.round(7.5 * scaleF)) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.currentDelay.toString(), this.w - 16 * scaleF, 17 * scaleF);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#10b981'; // Green Ready
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(this.w - 22 * scaleF, 8 * scaleF, 12 * scaleF, 12 * scaleF, 2 * scaleF);
      } else {
        ctx.rect(this.w - 22 * scaleF, 8 * scaleF, 12 * scaleF, 12 * scaleF);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.max(5, Math.round(7 * scaleF)) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText("⚡", this.w - 16 * scaleF, 17 * scaleF);
      ctx.textAlign = 'left';
    }

    // 6. Expanded Description Box Under Portrait (Reclaimed space, with text wrapping for readability)
    const abilityStr = this.getAbilityText();
    if (abilityStr) {
      const descY = 74 * scaleF;
      const descH = 26 * scaleF;
      const descW = this.w - 12 * scaleF;
      const descX = 6 * scaleF;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(descX, descY, descW, descH, 4 * scaleF);
      } else {
        ctx.rect(descX, descY, descW, descH);
      }
      ctx.fill();

      ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
      ctx.lineWidth = 1 * scaleF;
      ctx.stroke();

      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold ' + Math.max(5.5, Math.round(6.5 * scaleF)) + 'px monospace';
      ctx.textAlign = 'center';

      const words = abilityStr.split(' ');
      let lines: string[] = [];
      let currentLine = '';
      const maxWidth = descW - 6 * scaleF;

      for (let n = 0; n < words.length; n++) {
        let testLine = currentLine + (currentLine ? ' ' : '') + words[n];
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          lines.push(currentLine);
          currentLine = words[n];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      const lineH = 7.5 * scaleF;
      const startTextY = descY + (descH - (lines.length - 1) * lineH) / 2 + 2 * scaleF;
      lines.forEach((line, idx) => {
        ctx.fillText(line, this.w / 2, startTextY + idx * lineH);
      });
      ctx.textAlign = 'left';
    }

    // 7. Stat Shields (Crimson Left Atk / Emerald Right HP)
    const statRadius = 11 * scaleF;
    const statY = this.h - 13 * scaleF;

    // Determine ATK Color according to dynamic rules
    let atkColor = '#ffffff';
    if (this.attack > this.baseAttack) {
      atkColor = '#4ADE80'; // Bright Green (Buffed/Surged)
    } else if (this.attack < this.baseAttack) {
      atkColor = '#F87171'; // Soft Red (Debuffed/Weakened)
    }

    // Determine HP Color according to dynamic rules
    let hpColor = '#ffffff';
    if (this.hp < this.maxHp) {
      hpColor = '#F87171'; // Soft Red (Damaged)
    } else if (this.hp > this.baseMaxHp || this.maxHp > this.baseMaxHp) {
      hpColor = '#4ADE80'; // Bright Green (Buffed)
    }

    // Attack Circular Shield
    const atkX = 14 * scaleF;
    ctx.save();
    ctx.fillStyle = '#1c0507'; // Deep dark shield background
    ctx.beginPath();
    ctx.arc(atkX, statY, statRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.attack > this.baseAttack ? '#22c55e' : (this.attack < this.baseAttack ? '#ef4444' : '#dc2626');
    ctx.lineWidth = 1.5 * scaleF;
    ctx.stroke();
    // Attack text inside
    ctx.fillStyle = atkColor;
    ctx.font = 'bold ' + Math.max(8, Math.round(9 * scaleF)) + 'px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText("⚔️" + this.attack, atkX, statY + 3 * scaleF);
    ctx.restore();

    // HP Circular Shield
    const hpX = this.w - 14 * scaleF;
    ctx.save();
    ctx.fillStyle = '#021f0f'; // Deep green HP shield background
    ctx.beginPath();
    ctx.arc(hpX, statY, statRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.hp < this.maxHp ? '#ef4444' : (this.hp > this.baseMaxHp ? '#22c55e' : '#10b981');
    ctx.lineWidth = 1.5 * scaleF;
    ctx.stroke();
    // HP text inside
    ctx.fillStyle = hpColor;
    ctx.font = 'bold ' + Math.max(8, Math.round(9 * scaleF)) + 'px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText("❤️" + this.hp, hpX, statY + 3 * scaleF);
    ctx.restore();

    // Defeated / Dead overlay
    if (this.dead || this.hp <= 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(0, 0, this.w, this.h, 10 * scaleF);
      } else {
        ctx.rect(0, 0, this.w, this.h);
      }
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.font = Math.max(16, Math.round(24 * scaleF)) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText("💀", this.w / 2, this.h / 2 + (8 * scaleF));
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }
}
