import {
  W, H, HUD_TOP, SURFACE_Y, FLOOR_Y, HUD_BOTTOM, OXYGEN_MAX, OXYGEN_LOW, MAX_DIVERS, MAX_LIVES_DISPLAY,
} from './config';
import { Game, MENU_ITEMS, PAUSE_ITEMS, Explosion } from './game';
import { Sea } from './sea';
import { sprite, sharkColor } from './sprites';
import { drawText, drawTextCentered, textWidth } from './font';
import { Rng } from './rng';

const C = {
  sky: '#84c4f4',
  skyLow: '#b4e0fc',
  sun: '#ffe14a',
  water: ['#2868e0', '#2460d4', '#2058c8', '#1c50bc'],
  surface: '#f0fcff',
  wave: '#a8dcf8',
  sand: '#d4a858',
  sand2: '#b08838',
  sandDark: '#7c5a20',
  rock: '#5c4418',
  hud: '#0f1318',
  hudLine: '#3a4452',
  text: '#dfe6ee',
  dim: '#8a97a6',
  gold: '#ffe14a',
  red: '#ff4a4a',
  green: '#3ddc84',
  amber: '#ffb020',
};

const EXPLOSION_PATTERN: [number, number][] = [
  [-1, -0.7], [1, -0.7], [-0.9, 0.6], [0.9, 0.6], [0, -1], [0, 1], [-1, 0.05], [1, 0.05], [-0.5, -0.3], [0.5, 0.3],
];

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
    for (let i = 0; i < 18; i++) this.rocks.push([r.int(0, (W - 12) / 2) * 2, r.int(0, 3), r.int(2, 5)]);
    this.demoSea.patrolEnabled = true;
  }

  draw(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (g.state === 'menu' || g.state === 'howto' || g.state === 'ranking') {
      this.demoSea.update(1 / 60, 2, W / 2);
      this.drawSea(this.demoSea, g.time, 1);
      this.dim(0.58);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      this.drawHudFrames();
      this.drawHudHint(g);
      return;
    }

    this.drawSea(g.sea, g.time, g.level);
    this.drawPlayer(g);
    for (const ex of g.explosions) this.drawExplosion(ex);
    this.drawHud(g);
    if (g.bannerT > 0 && g.state === 'playing') this.drawBanner(g);

    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- world ----------

  /** Draw a sprite centred on an entity box (boxes keep gameplay sizes; art may differ). */
  private blit(spr: HTMLCanvasElement, x: number, y: number, w: number, h: number): void {
    this.ctx.drawImage(spr, Math.round(x + (w - spr.width) / 2), Math.round(y + (h - spr.height) / 2));
  }

  private drawSea(sea: Sea, time: number, level: number): void {
    const ctx = this.ctx;
    // Sky band
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, HUD_TOP, W, SURFACE_Y - HUD_TOP);
    ctx.fillStyle = C.skyLow;
    ctx.fillRect(0, SURFACE_Y - 8, W, 8);
    ctx.fillStyle = C.sun;
    ctx.fillRect(274, HUD_TOP + 4, 12, 8);
    ctx.fillRect(276, HUD_TOP + 2, 8, 12);

    // Water: vivid 2600 blue, lightly banded towards the floor
    const bandH = (FLOOR_Y - SURFACE_Y) / C.water.length;
    C.water.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, Math.round(SURFACE_Y + i * bandH), W, Math.ceil(bandH) + 1);
    });

    // Surface line and drifting wave crests (wide pixels)
    ctx.fillStyle = C.surface;
    ctx.fillRect(0, SURFACE_Y - 1, W, 2);
    ctx.fillStyle = C.wave;
    const off = Math.floor(time * 10) % 16;
    for (let x = -16 + off; x < W; x += 16) {
      ctx.fillRect(x, SURFACE_Y + 1, 6, 1);
      ctx.fillRect(x + 8, SURFACE_Y + 3, 4, 1);
    }

    // Sea floor: sand with stepped relief and a darker base
    ctx.fillStyle = C.sand;
    ctx.fillRect(0, FLOOR_Y, W, HUD_BOTTOM - FLOOR_Y);
    ctx.fillStyle = C.sand2;
    for (let x = 0; x < W; x += 8) ctx.fillRect(x + ((x >> 3) & 1) * 4, FLOOR_Y + 3, 4, 1);
    for (let x = 4; x < W; x += 16) ctx.fillRect(x, FLOOR_Y + 6, 6, 1);
    ctx.fillStyle = C.sandDark;
    ctx.fillRect(0, HUD_BOTTOM - 2, W, 2);
    for (const [x, dy, w] of this.rocks) {
      ctx.fillStyle = C.sand;
      ctx.fillRect(x - 2, FLOOR_Y - 1 - dy, w * 2 + 4, 2 + dy);
      ctx.fillStyle = C.rock;
      ctx.fillRect(x, FLOOR_Y - 2 - dy, w * 2, 2);
      ctx.fillStyle = C.sand2;
      ctx.fillRect(x, FLOOR_Y + dy, w * 2, 1);
    }

    // Divers, enemies, torpedoes, patrol
    const frame = Math.floor(time * 6) % 4; // 0 1 2 1 (ping-pong)
    const f3 = frame === 3 ? 1 : frame;
    const tint = sharkColor(level);
    for (const d of sea.divers) {
      if (d.dead) continue;
      this.blit(sprite(`diver${f3}`, d.dir === -1), d.x, d.y, d.w, d.h);
    }
    const subFrame = Math.floor(time * 10) % 2;
    for (const e of sea.enemies) {
      if (e.dead) continue;
      const spr = e.kind === 'sub' ? sprite(`esub${subFrame}`, e.dir === -1) : sprite(`shark${f3}`, e.dir === -1, tint);
      this.blit(spr, e.x, e.y, e.w, e.h);
    }
    ctx.fillStyle = C.red;
    for (const t of sea.torpedoes) ctx.fillRect(Math.round(t.x), Math.round(t.y), t.w, t.h);
    if (sea.patrol.active) {
      const p = sea.patrol;
      this.blit(sprite('patrol', p.dir === -1), p.x, p.y, p.w, p.h);
    }
  }

  private drawPlayer(g: Game): void {
    if (g.state !== 'playing' && g.state !== 'paused') return;
    const ctx = this.ctx;
    const p = g.player;
    const frame = g.moving ? Math.floor(g.time * 12) % 2 : 0;
    this.blit(sprite(`sub${frame}`, g.facing === -1), p.x, p.y, p.w, p.h);
    if (g.torpedo) {
      ctx.fillStyle = C.gold;
      ctx.fillRect(Math.round(g.torpedo.x), Math.round(g.torpedo.y), g.torpedo.w, g.torpedo.h);
    }
    if (g.moving && !g.atSurface && Math.floor(g.time * 20) % 2 === 0) {
      ctx.fillStyle = C.surface;
      const bx = g.facing === 1 ? p.x - 4 : p.x + p.w + 2;
      ctx.fillRect(Math.round(bx), Math.round(p.y + 3), 2, 1);
    }
  }

  /** Blocky 2600-style explosion: wide rectangles flung outwards, colour stepping white > yellow > orange > red > grey. */
  private drawExplosion(ex: Explosion): void {
    const ctx = this.ctx;
    const p = ex.t / ex.dur;
    const cx = Math.round(ex.x);
    const cy = Math.round(ex.y);
    const spread = (ex.big ? 20 : 12) * p;
    const flicker = Math.floor(ex.t * 30) % 2;
    const steps = ['#ffffff', C.gold, '#ff7a1a', '#e03820', '#707070'];
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length) + flicker);
    ctx.fillStyle = steps[Math.min(steps.length - 1, idx)];
    const bw = ex.big ? 6 : 4;
    for (const [dx, dy] of EXPLOSION_PATTERN) {
      const x = Math.round(cx + dx * spread);
      const y = Math.round(cy + dy * spread * 0.6);
      ctx.fillRect(x - bw / 2, y - 1, bw, 2);
    }
    const core = Math.round((1 - p) * (ex.big ? 8 : 5));
    if (core > 0) {
      ctx.fillStyle = flicker ? C.gold : '#ffffff';
      ctx.fillRect(cx - core * 2, cy - core, core * 4, core * 2);
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
      if (i < g.divers) ctx.drawImage(icon, 66 + i * 10, y0 + 19);
      else { ctx.fillStyle = '#2a3340'; ctx.fillRect(66 + i * 10, y0 + 20, 8, 2); }
    }
    if (g.divers >= MAX_DIVERS && blink) drawText(ctx, 'SUBA!', 132, y0 + 20, C.green, 1);

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
    ctx.drawImage(sprite('sub0'), W / 2 - 24, 66 + bob, 48, 27);

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
