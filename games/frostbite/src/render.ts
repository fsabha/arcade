import {
  W, H, HUD_H, SHORE_TOP, SHORE_BOTTOM, SHORE_Y, ROW_FEET, FLOE_H, BAILEY_H, IGLOO_X, IGLOO_Y, IGLOO_BLOCKS,
  BEAR_W, TEMP_START, isNight, blockPoints,
} from './config';
import { Game, MENU_ITEMS } from './game';
import { Sea } from './sea';
import { sprite } from './sprites';
import {
  drawText, textWidth, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen,
  drawInitialsScreen,
} from '@arcade/shared';

const DAY = { sky: '#9cc8f0', shore: '#f4f8ff', shoreEdge: '#c8d8e8', water: '#2050c8', floe: '#f8f8ff', floeBlue: '#78b0f0', floeShade: '#b0c8e8' };
const NIGHT = { sky: '#182048', shore: '#b8c4d8', shoreEdge: '#7888a8', water: '#0c1a60', floe: '#d8e0f0', floeBlue: '#4878c0', floeShade: '#8898b8' };
const C = { text: '#dfe6ee', dim: '#8a97a6', gold: '#ffe14a', red: '#ff4a4a', green: '#3ddc84', igloo: '#c8d0d8', iglooLine: '#7c8690', door: '#202830' };

// igloo blocks, bottom row first: 6 + 5 + 3 + 1, then the door
const IGLOO_ROWS = [6, 5, 3, 1];
const BLOCK_W = 8;
const BLOCK_H = 5;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demo = new Sea(1, 3);

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
      this.demo.update(1 / 60);
      this.drawScene(this.demo, 1, g.time, null);
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    this.drawScene(g.sea, g.level, g.time, g);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- scene ----------

  private drawScene(sea: Sea, level: number, time: number, g: Game | null): void {
    const ctx = this.ctx;
    const pal = isNight(level) ? NIGHT : DAY;
    ctx.fillStyle = pal.sky;
    ctx.fillRect(0, HUD_H, W, SHORE_TOP - HUD_H);
    ctx.fillStyle = pal.shore;
    ctx.fillRect(0, SHORE_TOP, W, SHORE_BOTTOM - SHORE_TOP);
    ctx.fillStyle = pal.shoreEdge;
    ctx.fillRect(0, SHORE_BOTTOM - 3, W, 3);
    ctx.fillStyle = pal.water;
    ctx.fillRect(0, SHORE_BOTTOM, W, H - SHORE_BOTTOM);

    this.drawIgloo(g ? g.blocks : 16, g ? g.iglooDone : true);

    // floes
    for (let r = 0; r < sea.rows.length; r++) {
      const row = sea.rows[r];
      const y = ROW_FEET[r];
      for (const x of sea.floes(r)) {
        for (const base of [x - W, x]) {
          if (base + sea.floeW < 0 || base > W) continue;
          ctx.fillStyle = row.white ? pal.floe : pal.floeBlue;
          ctx.fillRect(Math.round(base) + 2, y, sea.floeW - 4, FLOE_H);
          ctx.fillRect(Math.round(base), y + 2, sea.floeW, FLOE_H - 4);
          ctx.fillStyle = pal.floeShade;
          ctx.fillRect(Math.round(base) + 2, y + FLOE_H - 2, sea.floeW - 4, 2);
        }
      }
      // creatures
      const grp = row.group;
      if (grp) {
        const frame = Math.floor(time * 5) % 2;
        for (let i = 0; i < grp.xs.length; i++) {
          if (!grp.alive[i]) continue;
          const name = grp.kind === 'goose' ? `goose${frame}` : grp.kind === 'clam' ? `clam${frame}` : grp.kind;
          const s = sprite(name, grp.dir < 0);
          const sy = grp.kind === 'fish' ? y + 2 : y - s.height + 1;
          for (const base of [grp.xs[i] - W, grp.xs[i]]) {
            if (base + grp.w < 0 || base > W) continue;
            ctx.drawImage(s, Math.round(base), sy);
          }
        }
      }
    }

    if (g) {
      if (g.bearActive) ctx.drawImage(sprite(`bear${Math.floor(time * 4) % 2}`, g.bearDir > 0), Math.round(g.bearX), SHORE_Y - 9);
      this.drawBailey(g);
    } else {
      ctx.drawImage(sprite('stand'), 40, SHORE_Y - BAILEY_H);
    }
  }

  private drawIgloo(blocks: number, done: boolean): void {
    const ctx = this.ctx;
    const cx = IGLOO_X + 24;
    let n = 0;
    IGLOO_ROWS.forEach((count, r) => {
      const left = cx - (count * BLOCK_W) / 2;
      const y = IGLOO_Y - (r + 1) * BLOCK_H;
      for (let i = 0; i < count; i++) {
        if (n++ >= Math.min(blocks, IGLOO_BLOCKS - 1)) return;
        ctx.fillStyle = C.igloo;
        ctx.fillRect(left + i * BLOCK_W, y, BLOCK_W, BLOCK_H);
        ctx.fillStyle = C.iglooLine;
        ctx.fillRect(left + i * BLOCK_W, y, 1, BLOCK_H);
        ctx.fillRect(left + i * BLOCK_W, y + BLOCK_H - 1, BLOCK_W, 1);
      }
    });
    if (blocks === 0) {
      ctx.fillStyle = C.iglooLine; // the gray base of a new igloo
      ctx.fillRect(cx - 24, IGLOO_Y - 1, 48, 1);
    }
    if (done) {
      ctx.fillStyle = C.door;
      ctx.fillRect(cx - 4, IGLOO_Y - BLOCK_H * 2, 8, BLOCK_H * 2);
    }
  }

  private drawBailey(g: Game): void {
    const b = g.bailey;
    const ctx = this.ctx;
    if (b.mode === 'enter') {
      if (Math.floor(b.t * 6) % 2 === 0) return; // waving goodbye from inside
    }
    let name = 'stand';
    switch (b.mode) {
      case 'stand': name = b.walking ? `run${Math.floor(b.phase) % 2}` : 'stand'; break;
      case 'jump': name = 'jump'; break;
      case 'splash': name = 'splash'; break;
      case 'freeze': name = Math.floor(b.t * 8) % 2 ? 'stand' : 'jump'; break;
      case 'chased': name = `run${Math.floor(g.time * 12) % 2}`; break;
      case 'enter': name = 'stand'; break;
    }
    let lift = 0;
    if (b.mode === 'jump') lift = Math.sin(Math.PI * Math.min(1, b.t / 0.42)) * 10;
    ctx.drawImage(sprite(name, b.facing < 0), Math.round(b.x), Math.round(b.feet - lift) - BAILEY_H);
    if (b.mode === 'splash') {
      ctx.fillStyle = '#ffffff';
      const k = Math.min(1, b.t / 0.4);
      ctx.fillRect(Math.round(b.x) - 4, Math.round(b.feet) - 2, 4, 2 + k * 6);
      ctx.fillRect(Math.round(b.x) + 16, Math.round(b.feet) - 2, 4, 2 + k * 6);
    }
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, HUD_H);
    drawText(ctx, String(g.score).padStart(6, '0'), 8, 4, C.text, 2);
    const cold = g.temperature <= 10 && Math.floor(g.time * 4) % 2 === 0;
    const temp = String(g.temperature).padStart(2, ' ');
    drawText(ctx, temp, 150, 4, cold ? C.red : C.text, 2);
    ctx.fillStyle = cold ? C.red : C.text;
    ctx.fillRect(150 + textWidth(temp, 2) + 2, 4, 3, 3); // degree mark
    drawText(ctx, `NIVEL ${g.level}`, 150, 16, C.dim);
    for (let i = 0; i < g.reserve; i++) {
      ctx.fillStyle = '#e04040';
      ctx.fillRect(W - 12 - i * 8, 6, 4, 6);
      ctx.fillStyle = '#3860c8';
      ctx.fillRect(W - 12 - i * 8, 12, 4, 4);
    }
    drawText(ctx, `${g.blocks}/${IGLOO_BLOCKS}`, 8, 17, C.dim);
  }

  // ---------- screens (shared look, game-specific words) ----------

  private drawMenu(g: Game): void {
    drawMenuScreen(this.ctx, W, H, {
      title: 'FROSTBITE', titleColor: '#9cc8f0', subtitle: 'CONSTRUA O IGLU ANTES DE CONGELAR',
      labels: MENU_ITEMS.map((item) => (item === 'JOGO' ? `JOGO: ${g.variation === 'regular' ? 'NORMAL (NIVEL 1)' : 'AVANCADO (NIVEL 5)'}` : g.shell.label(item))),
      selected: g.menuIndex, time: g.time, itemsY: 86,
      footer: ['SETAS MOVEM E PULAM  ESPACO INVERTE O GELO', 'ACTIVISION 1983  EDICAO BROWSER'], footerY: 190,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'PULE ENTRE AS FILEIRAS DE GELO (CIMA E BAIXO)',
      'GELO BRANCO = 1 BLOCO NO IGLU E ' + blockPoints(1) + ' PONTOS',
      'DEPOIS DE PISADO FICA AZUL; 4 FILEIRAS AZUIS VIRAM BRANCAS',
      'ESPACO INVERTE A FILEIRA, MAS CUSTA 1 BLOCO',
      'COM 16 BLOCOS A PORTA APARECE: ENTRE NO IGLU',
      'BONUS: 160 X NIVEL + 10 X GRAUS X NIVEL',
      'A TEMPERATURA CAI 1 GRAU POR SEGUNDO: 0 CONGELA',
      'GANSOS CARANGUEJOS E MARISCOS EMPURRAM VOCE',
      'PEIXE VALE 200  URSO NA PRAIA A PARTIR DO NIVEL 4',
      'VIDA EXTRA A CADA 5000 PONTOS',
    ]);
  }

  private drawRanking(g: Game, menu: boolean): void {
    const rows = g.highScores.map((h, i) => `${String(i + 1).padStart(2, ' ')} ${h.initials.padEnd(3, ' ')} ${String(h.score).padStart(6, ' ')} NIV ${String(h.level).padStart(2, ' ')} ${(h.mode || '').slice(0, 3)}`);
    drawRankingScreen(this.ctx, W, H, rows, menu);
  }

  private drawPaused(g: Game): void {
    drawPausedScreen(this.ctx, W, H, g.pauseIndex);
  }

  private drawGameOver(g: Game): void {
    drawGameOverScreen(this.ctx, W, H, {
      lines: [`PONTOS ${g.score}`, `NIVEL ${g.level}  IGLUS ${g.igloosBuilt}`, `TEMPERATURA FINAL ${g.temperature} DE ${TEMP_START}`],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }

  private drawInitials(g: Game): void {
    drawInitialsScreen(this.ctx, W, H, `${g.score} PONTOS`, g.initials, g.initialsPos, g.time);
  }
}

export { BEAR_W };
