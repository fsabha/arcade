import { W, H, PLAY_H, HUD_H, FUEL_MAX, FUEL_LOW, MAX_LIVES_DISPLAY, POINTS } from './config';
import { River } from './river';
import { Game, MENU_ITEMS, PAUSE_ITEMS, Enemy, Explosion } from './game';
import { sprite } from './sprites';
import { drawText, drawTextCentered, textWidth } from './font';

const C = {
  water: '#1f47d6',
  water2: '#2552e6',
  bank: '#3c9a3c',
  bank2: '#368c36',
  shore: '#d9c76b',
  hud: '#0f1318',
  hudLine: '#3a4452',
  text: '#dfe6ee',
  dim: '#8a97a6',
  gold: '#ffe14a',
  red: '#ff4a4a',
  green: '#3ddc84',
  amber: '#ffb020',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demoRiver = new River(7);

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  draw(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (g.state === 'menu' || g.state === 'howto' || g.state === 'ranking') {
      this.drawRiver(this.demoRiver, g.time * 35);
      this.dim(0.62);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo(g);
      else this.drawRanking(g, true);
      this.drawHudFrame();
      this.drawHudHint(g);
      return;
    }

    this.drawRiver(g.river, g.camY);
    this.drawEntities(g);
    this.drawHud(g);

    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- world ----------

  private drawRiver(river: River, camY: number): void {
    const ctx = this.ctx;
    const base = Math.floor(camY);
    river.ensure(base + PLAY_H + 16);

    ctx.fillStyle = C.water;
    ctx.fillRect(0, 0, W, PLAY_H);

    for (let sy = 0; sy < PLAY_H; sy++) {
      const wy = base + PLAY_H - 1 - sy;
      const row = river.rowAt(wy);
      const left = Math.round(row.left);
      const right = Math.round(row.right);
      const bankCol = (wy >> 3) & 1 ? C.bank : C.bank2;
      ctx.fillStyle = bankCol;
      ctx.fillRect(0, sy, left - 2, 1);
      ctx.fillRect(right + 2, sy, W - right - 2, 1);
      ctx.fillStyle = C.shore;
      ctx.fillRect(left - 2, sy, 2, 1);
      ctx.fillRect(right, sy, 2, 1);
      if ((wy & 7) === 0) {
        ctx.fillStyle = C.water2;
        ctx.fillRect(left, sy, right - left, 1);
      }
      if (row.island) {
        const il = Math.round(row.island[0]);
        const ir = Math.round(row.island[1]);
        if (ir - il >= 2) {
          ctx.fillStyle = C.shore;
          ctx.fillRect(il, sy, ir - il, 1);
          if (ir - il > 4) {
            ctx.fillStyle = bankCol;
            ctx.fillRect(il + 2, sy, ir - il - 4, 1);
          }
        }
      }
    }

    // Trees on land, deterministic per 8x8 cell
    const tree = sprite('tree');
    const cy0 = Math.floor(base / 8);
    const cy1 = Math.floor((base + PLAY_H) / 8) + 1;
    for (let cy = cy0; cy <= cy1; cy++) {
      const wy = cy * 8;
      const row = river.rowAt(wy + 3);
      for (let cx = 0; cx < W / 8; cx++) {
        const hsh = (Math.imul(cx + 1, 73856093) ^ Math.imul(cy + 1, 19349663)) >>> 0;
        if (hsh % 5 !== 0) continue;
        const x = cx * 8 + (hsh >> 8) % 3;
        const onLand =
          x + 6 <= row.left - 3 ||
          x >= row.right + 3 ||
          (row.island !== null && x >= row.island[0] + 2 && x + 6 <= row.island[1] - 2);
        if (!onLand) continue;
        const sy = PLAY_H - (wy + 6 - base);
        ctx.drawImage(tree, x, sy);
      }
    }
  }

  private screenY(worldBottom: number, h: number, camY: number): number {
    return Math.round(PLAY_H - (worldBottom + h - camY));
  }

  private drawEntities(g: Game): void {
    const ctx = this.ctx;
    const heliFrame = Math.floor(g.time * 12) % 2;

    const order: Enemy[] = [...g.enemies].sort((a, b) => (a.kind === 'bridge' ? -1 : 0) - (b.kind === 'bridge' ? -1 : 0));
    for (const e of order) {
      const sy = this.screenY(e.y, e.h, g.camY);
      const sx = Math.round(e.x);
      switch (e.kind) {
        case 'ship': ctx.drawImage(sprite('ship'), sx, sy); break;
        case 'heli': ctx.drawImage(sprite(heliFrame ? 'heli1' : 'heli0'), sx, sy); break;
        case 'jet': ctx.drawImage(sprite(e.vx < 0 ? 'jetL' : 'jet'), sx, sy); break;
        case 'bridge': ctx.drawImage(sprite('bridge'), sx, sy); break;
        case 'fuel':
          ctx.drawImage(sprite('fuel'), sx, sy);
          'FUEL'.split('').forEach((ch, i) => drawText(ctx, ch, sx + 7, sy + 3 + i * 4, C.red, 1));
          break;
      }
    }

    ctx.fillStyle = C.gold;
    for (const b of g.bullets) {
      ctx.fillRect(Math.round(b.x), this.screenY(b.y, b.h, g.camY), b.w, b.h);
    }

    if (g.state === 'playing' || g.state === 'paused') {
      const p = g.player;
      const sy = this.screenY(p.y, p.h, g.camY);
      ctx.drawImage(sprite('player'), Math.round(p.x), sy);
      // exhaust flicker
      if (Math.floor(g.time * 20) % 2 === 0) {
        ctx.fillStyle = g.speedMode === 'fast' ? '#ffb020' : '#ff6a1a';
        ctx.fillRect(Math.round(p.x) + 7, sy + 16, 2, g.speedMode === 'fast' ? 4 : 2);
      }
    }

    for (const ex of g.explosions) this.drawExplosion(ex, g.camY);
  }

  private drawExplosion(ex: Explosion, camY: number): void {
    if (ex.t < 0) return;
    const ctx = this.ctx;
    const p = ex.t / ex.dur;
    const cx = Math.round(ex.x);
    const cy = Math.round(PLAY_H - (ex.y - camY));
    const maxR = ex.big ? 22 : 13;
    const r = p * maxR;
    const color = p < 0.25 ? '#ffffff' : p < 0.55 ? C.gold : p < 0.8 ? '#ff6a1a' : '#6b6b6b';
    const size = ex.big ? 4 : 3;
    ctx.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + p * 0.8;
      const px = Math.round(cx + Math.cos(a) * r - size / 2);
      const py = Math.round(cy + Math.sin(a) * r - size / 2);
      ctx.fillRect(px, py, size, size);
    }
    const core = Math.round((1 - p) * (ex.big ? 10 : 6));
    if (core > 0) {
      ctx.fillStyle = p < 0.4 ? '#ffffff' : C.gold;
      ctx.fillRect(cx - core, cy - core, core * 2, core * 2);
    }
  }

  // ---------- HUD ----------

  private drawHudFrame(): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.hud;
    ctx.fillRect(0, PLAY_H, W, HUD_H);
    ctx.fillStyle = C.hudLine;
    ctx.fillRect(0, PLAY_H, W, 1);
  }

  private drawHudHint(g: Game): void {
    const ctx = this.ctx;
    const blink = Math.floor(g.time * 2) % 2 === 0;
    drawTextCentered(ctx, 'SETAS/WASD MOVER   ESPACO ATIRAR', W / 2, PLAY_H + 8, C.dim, 1);
    drawTextCentered(ctx, 'P PAUSA   M SOM   C CRT', W / 2, PLAY_H + 18, C.dim, 1);
    if (blink) drawTextCentered(ctx, 'ENTER OU FOGO: SELECIONAR', W / 2, PLAY_H + 32, C.text, 1);
  }

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    this.drawHudFrame();
    const y0 = PLAY_H;

    drawText(ctx, 'PONTOS', 8, y0 + 4, C.dim, 1);
    drawText(ctx, String(g.score.score).padStart(6, '0'), 8, y0 + 11, C.gold, 2);

    drawText(ctx, 'VIDAS', 100, y0 + 4, C.dim, 1);
    const lives = Math.max(0, g.score.lives - (g.state === 'playing' || g.state === 'paused' || g.state === 'dying' ? 1 : 0));
    const life = sprite('life');
    if (lives <= MAX_LIVES_DISPLAY) {
      for (let i = 0; i < lives; i++) ctx.drawImage(life, 100 + i * 9, y0 + 12);
    } else {
      ctx.drawImage(life, 100, y0 + 12);
      drawText(ctx, 'X' + lives, 110, y0 + 13, C.text, 1);
    }

    drawText(ctx, 'SECAO', 190, y0 + 4, C.dim, 1);
    drawText(ctx, String(g.sectionNumber).padStart(2, '0'), 190, y0 + 11, C.text, 2);

    // Fuel gauge
    const gx = 16;
    const gy = y0 + 34;
    const gw = W - 32;
    const gh = 8;
    drawText(ctx, 'E', gx - 8, gy + 1, C.text, 1);
    drawText(ctx, 'F', gx + gw + 4, gy + 1, C.text, 1);
    drawTextCentered(ctx, '1/2', gx + gw / 2, gy - 7, C.dim, 1);
    ctx.fillStyle = '#2a3340';
    ctx.fillRect(gx, gy, gw, gh);
    const frac = Math.max(0, Math.min(1, g.fuel / FUEL_MAX));
    const low = g.fuel < FUEL_LOW;
    const blink = Math.floor(g.time * 4) % 2 === 0;
    ctx.fillStyle = low ? (blink ? C.red : '#a02020') : g.fuel < 50 ? C.amber : C.green;
    ctx.fillRect(gx + 1, gy + 1, Math.round((gw - 2) * frac), gh - 2);
    ctx.fillStyle = C.text;
    for (const t of [0.25, 0.5, 0.75]) ctx.fillRect(gx + Math.round(gw * t), gy, 1, gh);
    ctx.fillStyle = C.hudLine;
    ctx.fillRect(gx, gy, gw, 1);
    ctx.fillRect(gx, gy + gh - 1, gw, 1);
    ctx.fillRect(gx, gy, 1, gh);
    ctx.fillRect(gx + gw - 1, gy, 1, gh);

    if (g.refueling && g.state === 'playing' && blink) drawTextCentered(ctx, 'ABASTECENDO', W / 2, y0 + 26, C.green, 1);
    if (g.speedMode !== 'normal' && g.state === 'playing') {
      drawTextCentered(ctx, g.speedMode === 'fast' ? '>> RAPIDO' : '<< LENTO', 150, y0 + 26, C.dim, 1);
    }
  }

  // ---------- overlays ----------

  private dim(alpha: number): void {
    this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    this.ctx.fillRect(0, 0, W, PLAY_H);
  }

  private panel(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6,10,20,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.hudLine;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  }

  private drawMenu(g: Game): void {
    const ctx = this.ctx;
    const blink = Math.floor(g.time * 2) % 2 === 0;
    const bob = Math.round(Math.sin(g.time * 2) * 2);

    drawTextCentered(ctx, 'RIVER RAID', W / 2 + 2, 34 + 2, '#5a3a00', 3);
    drawTextCentered(ctx, 'RIVER RAID', W / 2, 34, C.gold, 3);
    drawTextCentered(ctx, 'EDICAO BROWSER', W / 2, 56, C.dim, 1);

    const pl = sprite('player');
    ctx.drawImage(pl, W / 2 - 16, 74 + bob, 32, 32);

    const startY = 122;
    MENU_ITEMS.forEach((item, i) => {
      let label: string = item;
      if (item === 'CRT') label = `CRT: ${g.settings.crt ? 'LIGADO' : 'DESLIGADO'}`;
      if (item === 'SOM') label = `SOM: ${g.settings.sound ? 'LIGADO' : 'DESLIGADO'}`;
      const sel = i === g.menuIndex;
      const y = startY + i * 16;
      if (sel) {
        ctx.fillStyle = 'rgba(255,225,74,0.12)';
        ctx.fillRect(40, y - 4, W - 80, 14);
        if (blink) drawText(ctx, '>', 48, y, C.gold, 1);
      }
      drawTextCentered(ctx, label, W / 2, y, sel ? C.gold : C.text, 1);
    });

    drawTextCentered(ctx, 'HOMENAGEM AO CLASSICO DA ATARI 2600', W / 2, 232, C.dim, 1);
    drawTextCentered(ctx, '2026', W / 2, 242, C.dim, 1);
  }

  private drawHowTo(_g: Game): void {
    const ctx = this.ctx;
    this.panel(6, 8, W - 12, PLAY_H - 16);
    drawTextCentered(ctx, 'COMO JOGAR', W / 2, 16, C.gold, 2);
    const lines = [
      'VOE PELO RIO SEM BATER NAS',
      'MARGENS, ILHAS OU INIMIGOS.',
      '',
      'ATIRE EM NAVIOS, HELICOPTEROS',
      'E JATOS PARA MARCAR PONTOS.',
      '',
      'PASSE SOBRE OS DEPOSITOS DE',
      'FUEL PARA ABASTECER. SEM',
      'COMBUSTIVEL O AVIAO CAI.',
      '',
      'DESTRUA A PONTE NO FIM DE',
      'CADA SECAO PARA AVANCAR.',
      '',
      'CIMA ACELERA, BAIXO FREIA.',
      '3 VIDAS. VIDA EXTRA A CADA',
      '10000 PONTOS.',
    ];
    lines.forEach((l, i) => drawText(ctx, l, 16, 36 + i * 8, C.text, 1));

    const py = 36 + lines.length * 8 + 6;
    drawTextCentered(ctx, 'PONTOS', W / 2, py, C.dim, 1);
    const pts = [
      ['ship', `NAVIO ${POINTS.ship}`],
      ['heli0', `HELI ${POINTS.heli}`],
      ['fuel', `FUEL ${POINTS.fuel}`],
      ['jet', `JATO ${POINTS.jet}`],
    ] as const;
    pts.forEach(([sp, label], i) => {
      const x = 14 + i * 56;
      const s = sprite(sp);
      const scale = sp === 'fuel' ? 0.5 : sp === 'ship' ? 0.6 : 1;
      ctx.drawImage(s, x + 8 - (s.width * scale) / 2, py + 10, s.width * scale, s.height * scale);
      drawText(ctx, label, x + 18, py + 13, C.text, 1);
    });
    drawTextCentered(ctx, `PONTE ${POINTS.bridge}`, W / 2, py + 30, C.gold, 1);
  }

  private drawRanking(g: Game, fromMenu: boolean): void {
    const ctx = this.ctx;
    this.panel(6, 8, W - 12, PLAY_H - 16);
    drawTextCentered(ctx, 'RANKING', W / 2, 16, C.gold, 2);
    if (g.highScores.length === 0) {
      drawTextCentered(ctx, 'SEM RECORDES AINDA', W / 2, 120, C.dim, 1);
    } else {
      drawText(ctx, 'POS  NOME  PONTOS  SECAO', 22, 36, C.dim, 1);
      g.highScores.forEach((h, i) => {
        const y = 50 + i * 14;
        const isNew = !fromMenu && g.state === 'ranking' && h.initials === g.initials.join('') && h.score === g.score.score;
        const col = isNew ? C.gold : i === 0 ? C.text : C.text;
        drawText(ctx, `${String(i + 1).padStart(2, ' ')}.  ${h.initials.padEnd(3, ' ')}  ${String(h.score).padStart(6, '0')}   ${String(h.section).padStart(2, '0')}`, 22, y, col, 1);
      });
    }
    drawTextCentered(ctx, 'ENTER OU FOGO: VOLTAR', W / 2, PLAY_H - 22, C.dim, 1);
  }

  private drawPaused(g: Game): void {
    const ctx = this.ctx;
    this.dim(0.6);
    this.panel(40, 90, W - 80, 84);
    drawTextCentered(ctx, 'PAUSA', W / 2, 100, C.gold, 2);
    PAUSE_ITEMS.forEach((item, i) => {
      const sel = i === g.pauseIndex;
      const y = 126 + i * 14;
      if (sel) drawText(ctx, '>', W / 2 - textWidth(item) / 2 - 10, y, C.gold, 1);
      drawTextCentered(ctx, item, W / 2, y, sel ? C.gold : C.text, 1);
    });
    drawTextCentered(ctx, 'P OU ESC: CONTINUAR', W / 2, 160, C.dim, 1);
  }

  private drawGameOver(g: Game): void {
    const ctx = this.ctx;
    this.dim(0.6);
    this.panel(30, 80, W - 60, 104);
    drawTextCentered(ctx, 'GAME OVER', W / 2, 92, C.red, 2);
    drawTextCentered(ctx, g.deathReason, W / 2, 112, C.dim, 1);
    drawTextCentered(ctx, `PONTOS ${String(g.score.score).padStart(6, '0')}`, W / 2, 128, C.gold, 1);
    drawTextCentered(ctx, `SECAO ${g.sectionNumber}`, W / 2, 138, C.text, 1);
    if (g.stateTime >= 1.5 && Math.floor(g.time * 2) % 2 === 0) {
      drawTextCentered(ctx, g.qualifiesForRank ? 'NOVO RECORDE! ENTER' : 'ENTER OU FOGO: MENU', W / 2, 162, C.text, 1);
    }
  }

  private drawInitials(g: Game): void {
    const ctx = this.ctx;
    this.dim(0.6);
    this.panel(20, 70, W - 40, 130);
    drawTextCentered(ctx, 'NOVO RECORDE!', W / 2, 80, C.gold, 2);
    drawTextCentered(ctx, `PONTOS ${String(g.score.score).padStart(6, '0')}`, W / 2, 98, C.text, 1);
    drawTextCentered(ctx, 'DIGITE SUAS INICIAIS', W / 2, 110, C.dim, 1);
    const scale = 3;
    const cw = 4 * scale;
    const x0 = W / 2 - (cw * 3 - scale) / 2;
    const y = 124;
    const blink = Math.floor(g.time * 3) % 2 === 0;
    g.initials.forEach((ch, i) => {
      const sel = i === g.initialsPos;
      drawText(ctx, ch, x0 + i * cw, y, sel ? C.gold : C.text, scale);
      if (sel && blink) {
        ctx.fillStyle = C.gold;
        ctx.fillRect(x0 + i * cw, y + 5 * scale + 2, 3 * scale, 2);
      }
    });
    drawTextCentered(ctx, 'CIMA/BAIXO: LETRA', W / 2, 160, C.dim, 1);
    drawTextCentered(ctx, 'ESQ/DIR: POSICAO', W / 2, 170, C.dim, 1);
    drawTextCentered(ctx, 'ENTER OU FOGO: CONFIRMAR', W / 2, 184, C.text, 1);
  }
}
