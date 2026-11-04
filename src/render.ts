import {
  W, H, HUD_TOP, SURFACE_Y, FLOOR_Y, HUD_BOTTOM, OXYGEN_MAX, OXYGEN_LOW, MAX_DIVERS, MAX_LIVES_DISPLAY,
} from './config';
import { Game, MENU_ITEMS, PAUSE_ITEMS, Explosion } from './game';
import { Sea } from './sea';
import { sprite } from './sprites';
import { drawText, drawTextCentered, textWidth } from './font';
import { Rng } from './rng';

const C = {
  sky: '#78c4f0',
  skyLow: '#a8dcf8',
  sun: '#ffe14a',
  water: ['#1d5fd0', '#1a52b8', '#17479e', '#133a84'],
  wave: '#dff4ff',
  sand: '#c9b36a',
  sand2: '#b39c55',
  rock: '#6b5a3a',
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
  private demoSea = new Sea(7);
  private rocks: [number, number, number][] = [];

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    const r = new Rng(11);
    for (let i = 0; i < 22; i++) this.rocks.push([r.int(0, W - 6), r.int(0, 4), r.int(2, 5)]);
    this.demoSea.patrolEnabled = true;
  }

  draw(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (g.state === 'menu' || g.state === 'howto' || g.state === 'ranking') {
      this.demoSea.update(1 / 60, 2, W / 2);
      this.drawSea(this.demoSea, g.time);
      this.dim(0.58);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      this.drawHudFrames();
      this.drawHudHint(g);
      return;
    }

    this.drawSea(g.sea, g.time);
    this.drawPlayer(g);
    for (const ex of g.explosions) this.drawExplosion(ex);
    this.drawHud(g);
    if (g.bannerT > 0 && g.state === 'playing') this.drawBanner(g);

    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- world ----------

  private drawSea(sea: Sea, time: number): void {
    const ctx = this.ctx;
    // Sky
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, HUD_TOP, W, SURFACE_Y - HUD_TOP);
    ctx.fillStyle = C.skyLow;
    ctx.fillRect(0, SURFACE_Y - 6, W, 6);
    ctx.fillStyle = C.sun;
    ctx.fillRect(276, HUD_TOP + 4, 10, 10);
    ctx.fillRect(274, HUD_TOP + 6, 14, 6);
    ctx.fillRect(278, HUD_TOP + 2, 6, 14);

    // Water bands
    const bandH = (FLOOR_Y - SURFACE_Y) / C.water.length;
    C.water.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, Math.round(SURFACE_Y + i * bandH), W, Math.ceil(bandH) + 1);
    });
    // Waves
    ctx.fillStyle = C.wave;
    const off = Math.floor(time * 12) % 16;
    for (let x = -16 + off; x < W; x += 16) ctx.fillRect(x, SURFACE_Y, 8, 1);
    ctx.fillRect(0, SURFACE_Y - 1, W, 1);

    // Sea floor
    ctx.fillStyle = C.sand;
    ctx.fillRect(0, FLOOR_Y, W, HUD_BOTTOM - FLOOR_Y);
    ctx.fillStyle = C.sand2;
    for (let x = 0; x < W; x += 8) ctx.fillRect(x + ((x >> 3) & 1) * 4, FLOOR_Y + 4, 4, 1);
    ctx.fillStyle = C.rock;
    for (const [x, dy, w] of this.rocks) ctx.fillRect(x, FLOOR_Y - 2 + dy, w, 3);

    // Divers, enemies, torpedoes, patrol
    const frame = Math.floor(time * 4) % 2;
    for (const d of sea.divers) {
      if (d.dead) continue;
      ctx.drawImage(sprite(frame ? 'diver1' : 'diver0', d.dir === -1), Math.round(d.x), Math.round(d.y));
    }
    for (const e of sea.enemies) {
      if (e.dead) continue;
      const name = e.kind === 'sub' ? 'esub' : frame ? 'shark1' : 'shark0';
      ctx.drawImage(sprite(name, e.dir === -1), Math.round(e.x), Math.round(e.y));
    }
    ctx.fillStyle = C.red;
    for (const t of sea.torpedoes) ctx.fillRect(Math.round(t.x), Math.round(t.y), t.w, t.h);
    if (sea.patrol.active) {
      const p = sea.patrol;
      ctx.drawImage(sprite('patrol', p.dir === -1), Math.round(p.x), Math.round(p.y));
    }
  }

  private drawPlayer(g: Game): void {
    if (g.state !== 'playing' && g.state !== 'paused') return;
    const ctx = this.ctx;
    const p = g.player;
    ctx.drawImage(sprite('sub', g.facing === -1), Math.round(p.x), Math.round(p.y));
    if (g.torpedo) {
      ctx.fillStyle = C.gold;
      ctx.fillRect(Math.round(g.torpedo.x), Math.round(g.torpedo.y), g.torpedo.w, g.torpedo.h);
    }
    if (g.moving && Math.floor(g.time * 20) % 2 === 0) {
      ctx.fillStyle = C.wave;
      const bx = g.facing === 1 ? p.x - 3 : p.x + p.w + 1;
      ctx.fillRect(Math.round(bx), Math.round(p.y + 4), 2, 2);
    }
  }

  private drawExplosion(ex: Explosion): void {
    const ctx = this.ctx;
    const p = ex.t / ex.dur;
    const cx = Math.round(ex.x);
    const cy = Math.round(ex.y);
    const maxR = ex.big ? 20 : 11;
    const r = p * maxR;
    const color = p < 0.25 ? '#ffffff' : p < 0.55 ? C.gold : p < 0.8 ? '#ff6a1a' : '#6b6b6b';
    const size = ex.big ? 4 : 3;
    ctx.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + p * 0.8;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r - size / 2), Math.round(cy + Math.sin(a) * r - size / 2), size, size);
    }
    const core = Math.round((1 - p) * (ex.big ? 9 : 5));
    if (core > 0) {
      ctx.fillStyle = p < 0.4 ? '#ffffff' : C.gold;
      ctx.fillRect(cx - core, cy - core, core * 2, core * 2);
    }
  }

  // ---------- HUD ----------

  private drawHudFrames(): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.hud;
    ctx.fillRect(0, 0, W, HUD_TOP);
    ctx.fillRect(0, HUD_BOTTOM, W, H - HUD_BOTTOM);
    ctx.fillStyle = C.hudLine;
    ctx.fillRect(0, HUD_TOP - 1, W, 1);
    ctx.fillRect(0, HUD_BOTTOM, W, 1);
  }

  private drawHudHint(g: Game): void {
    const ctx = this.ctx;
    const blink = Math.floor(g.time * 2) % 2 === 0;
    drawTextCentered(ctx, 'SETAS/WASD MOVER   ESPACO ATIRAR   P PAUSA   M SOM   C CRT', W / 2, HUD_BOTTOM + 8, C.dim, 1);
    if (blink) drawTextCentered(ctx, 'ENTER OU FOGO: SELECIONAR', W / 2, HUD_BOTTOM + 20, C.text, 1);
    drawTextCentered(ctx, 'SEAQUEST', W / 2, 8, C.gold, 1);
  }

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    this.drawHudFrames();

    // Top: score, level, lives
    drawText(ctx, 'PONTOS', 8, 3, C.dim, 1);
    drawText(ctx, String(g.score.score).padStart(6, '0'), 8, 10, C.gold, 2);
    drawText(ctx, 'NIVEL', 150, 3, C.dim, 1);
    drawText(ctx, String(g.level).padStart(2, '0'), 150, 10, C.text, 2);
    drawText(ctx, 'VIDAS', 232, 3, C.dim, 1);
    const lives = Math.max(0, g.score.lives - 1);
    const life = sprite('life');
    if (lives <= MAX_LIVES_DISPLAY) {
      for (let i = 0; i < lives; i++) ctx.drawImage(life, 232 + i * 10, 11);
    } else {
      ctx.drawImage(life, 232, 11);
      drawText(ctx, 'X' + lives, 242, 11, C.text, 1);
    }

    // Bottom: oxygen + divers
    const y0 = HUD_BOTTOM;
    drawText(ctx, 'OXIGENIO', 8, y0 + 6, C.dim, 1);
    const gx = 48;
    const gw = 150;
    const gh = 8;
    const gy = y0 + 4;
    ctx.fillStyle = '#2a3340';
    ctx.fillRect(gx, gy, gw, gh);
    const frac = Math.max(0, Math.min(1, g.oxygen / OXYGEN_MAX));
    const low = g.oxygen < OXYGEN_LOW;
    const blink = Math.floor(g.time * 4) % 2 === 0;
    ctx.fillStyle = low ? (blink ? C.red : '#a02020') : g.oxygen < OXYGEN_MAX / 2 ? C.amber : C.green;
    ctx.fillRect(gx + 1, gy + 1, Math.round((gw - 2) * frac), gh - 2);
    ctx.fillStyle = C.hudLine;
    ctx.fillRect(gx, gy, gw, 1);
    ctx.fillRect(gx, gy + gh - 1, gw, 1);

    drawText(ctx, 'MERGULHADORES', 8, y0 + 20, C.dim, 1);
    const icon = sprite('diverIcon');
    for (let i = 0; i < MAX_DIVERS; i++) {
      if (i < g.divers) ctx.drawImage(icon, 66 + i * 8, y0 + 19);
      else { ctx.fillStyle = '#2a3340'; ctx.fillRect(66 + i * 8, y0 + 19, 4, 5); }
    }
    if (g.divers >= MAX_DIVERS && blink) drawText(ctx, 'SUBA!', 120, y0 + 20, C.green, 1);

    if (g.refilling && blink) drawText(ctx, 'ABASTECENDO', 210, y0 + 6, C.green, 1);
    else if (g.atSurface && g.state === 'playing') drawText(ctx, 'SUPERFICIE', 210, y0 + 6, C.dim, 1);
    drawText(ctx, `${g.sea.enemies.length} INIMIGOS`, 210, y0 + 20, C.dim, 1);
  }

  private drawBanner(g: Game): void {
    const ctx = this.ctx;
    ctx.globalAlpha = Math.min(1, g.bannerT / 0.5);
    this.panel(W / 2 - 80, 92, 160, 26);
    drawTextCentered(ctx, g.bannerText, W / 2, 101, C.gold, 1);
    ctx.globalAlpha = 1;
  }

  // ---------- overlays ----------

  private dim(alpha: number): void {
    this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    this.ctx.fillRect(0, 0, W, H);
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

    drawTextCentered(ctx, 'SEAQUEST', W / 2 + 2, 34 + 2, '#5a3a00', 3);
    drawTextCentered(ctx, 'SEAQUEST', W / 2, 34, C.gold, 3);
    drawTextCentered(ctx, 'EDICAO BROWSER', W / 2, 56, C.dim, 1);
    ctx.drawImage(sprite('sub'), W / 2 - 24, 68 + bob, 48, 24);

    const startY = 104;
    MENU_ITEMS.forEach((item, i) => {
      let label: string = item;
      if (item === 'CRT') label = `CRT: ${g.settings.crt ? 'LIGADO' : 'DESLIGADO'}`;
      if (item === 'SOM') label = `SOM: ${g.settings.sound ? 'LIGADO' : 'DESLIGADO'}`;
      const sel = i === g.menuIndex;
      const y = startY + i * 16;
      if (sel) {
        ctx.fillStyle = 'rgba(255,225,74,0.12)';
        ctx.fillRect(80, y - 4, W - 160, 14);
        if (blink) drawText(ctx, '>', 88, y, C.gold, 1);
      }
      drawTextCentered(ctx, label, W / 2, y, sel ? C.gold : C.text, 1);
    });

    drawTextCentered(ctx, 'HOMENAGEM AO CLASSICO DA ATARI 2600', W / 2, 188, C.dim, 1);
    drawTextCentered(ctx, '2026', W / 2, 198, C.dim, 1);
  }

  private drawHowTo(): void {
    const ctx = this.ctx;
    this.panel(6, HUD_TOP + 2, W - 12, HUD_BOTTOM - HUD_TOP - 4);
    drawTextCentered(ctx, 'COMO JOGAR', W / 2, HUD_TOP + 10, C.gold, 2);
    const left = [
      'RESGATE MERGULHADORES: PASSE',
      'POR CIMA DELES. MAXIMO DE 6.',
      '',
      'ATIRE EM TUBAROES E SUBMARINOS',
      'INIMIGOS. NAO ATIRE NOS',
      'MERGULHADORES!',
      '',
      'O OXIGENIO ACABA. SUBA A',
      'SUPERFICIE PARA ENCHER.',
      'SUBIR SEM MERGULHADOR',
      'CUSTA UMA VIDA.',
    ];
    left.forEach((l, i) => drawText(ctx, l, 14, HUD_TOP + 30 + i * 8, C.text, 1));
    const right = [
      'COM 6 MERGULHADORES:',
      'BONUS E PROXIMO NIVEL.',
      'COM 1 A 5: UM DESEMBARCA.',
      '',
      'CUIDADO COM O SUBMARINO',
      'DE PATRULHA NA SUPERFICIE.',
      '',
      'INIMIGO: 20 PTS NO NIVEL 1,',
      '+10 POR NIVEL (MAX 90).',
      '',
      '3 VIDAS. VIDA EXTRA A',
      'CADA 10000 PONTOS.',
    ];
    right.forEach((l, i) => drawText(ctx, l, 176, HUD_TOP + 30 + i * 8, i < 3 ? C.gold : C.dim, 1));
  }

  private drawRanking(g: Game, fromMenu: boolean): void {
    const ctx = this.ctx;
    this.panel(6, HUD_TOP + 2, W - 12, HUD_BOTTOM - HUD_TOP - 4);
    drawTextCentered(ctx, 'RANKING', W / 2, HUD_TOP + 10, C.gold, 2);
    if (g.highScores.length === 0) {
      drawTextCentered(ctx, 'SEM RECORDES AINDA', W / 2, 120, C.dim, 1);
    } else {
      drawText(ctx, 'POS  NOME  PONTOS  NIVEL', 86, HUD_TOP + 30, C.dim, 1);
      g.highScores.forEach((h, i) => {
        const y = HUD_TOP + 42 + i * 12;
        const isNew = !fromMenu && h.initials === g.initials.join('') && h.score === g.score.score;
        drawText(ctx, `${String(i + 1).padStart(2, ' ')}.  ${h.initials.padEnd(3, ' ')}  ${String(h.score).padStart(6, '0')}    ${String(h.level).padStart(2, '0')}`, 86, y, isNew ? C.gold : C.text, 1);
      });
    }
    drawTextCentered(ctx, 'ENTER OU FOGO: VOLTAR', W / 2, HUD_BOTTOM - 14, C.dim, 1);
  }

  private drawPaused(g: Game): void {
    const ctx = this.ctx;
    this.dim(0.6);
    this.panel(80, 70, W - 160, 84);
    drawTextCentered(ctx, 'PAUSA', W / 2, 80, C.gold, 2);
    PAUSE_ITEMS.forEach((item, i) => {
      const sel = i === g.pauseIndex;
      const y = 106 + i * 14;
      if (sel) drawText(ctx, '>', W / 2 - textWidth(item) / 2 - 10, y, C.gold, 1);
      drawTextCentered(ctx, item, W / 2, y, sel ? C.gold : C.text, 1);
    });
    drawTextCentered(ctx, 'P OU ESC: CONTINUAR', W / 2, 140, C.dim, 1);
  }

  private drawGameOver(g: Game): void {
    const ctx = this.ctx;
    this.dim(0.6);
    this.panel(60, 60, W - 120, 104);
    drawTextCentered(ctx, 'FIM DE JOGO', W / 2, 72, C.red, 2);
    drawTextCentered(ctx, g.deathReason, W / 2, 92, C.dim, 1);
    drawTextCentered(ctx, `PONTOS ${String(g.score.score).padStart(6, '0')}`, W / 2, 108, C.gold, 1);
    drawTextCentered(ctx, `NIVEL ${g.level}`, W / 2, 118, C.text, 1);
    if (g.stateTime >= 1.5 && Math.floor(g.time * 2) % 2 === 0) {
      drawTextCentered(ctx, g.qualifiesForRank ? 'NOVO RECORDE! ENTER' : 'ENTER OU FOGO: MENU', W / 2, 142, C.text, 1);
    }
  }

  private drawInitials(g: Game): void {
    const ctx = this.ctx;
    this.dim(0.6);
    this.panel(50, 40, W - 100, 140);
    drawTextCentered(ctx, 'NOVO RECORDE!', W / 2, 50, C.gold, 2);
    drawTextCentered(ctx, `PONTOS ${String(g.score.score).padStart(6, '0')}`, W / 2, 68, C.text, 1);
    drawTextCentered(ctx, 'DIGITE SUAS INICIAIS', W / 2, 80, C.dim, 1);
    const scale = 3;
    const cw = 4 * scale;
    const x0 = W / 2 - (cw * 3 - scale) / 2;
    const y = 96;
    const blink = Math.floor(g.time * 3) % 2 === 0;
    g.initials.forEach((ch, i) => {
      const sel = i === g.initialsPos;
      drawText(ctx, ch, x0 + i * cw, y, sel ? C.gold : C.text, scale);
      if (sel && blink) {
        ctx.fillStyle = C.gold;
        ctx.fillRect(x0 + i * cw, y + 5 * scale + 2, 3 * scale, 2);
      }
    });
    drawTextCentered(ctx, 'CIMA/BAIXO: LETRA', W / 2, 132, C.dim, 1);
    drawTextCentered(ctx, 'ESQ/DIR: POSICAO', W / 2, 142, C.dim, 1);
    drawTextCentered(ctx, 'ENTER OU FOGO: CONFIRMAR', W / 2, 158, C.text, 1);
  }
}
