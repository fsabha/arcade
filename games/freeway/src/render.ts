import {
  W, H, HUD_TOP, ROAD_Y, MEDIAN_Y, MEDIAN_H, ROAD_BOTTOM, HUD_BOTTOM, LANE_H, CHICKEN_X, CHICKEN_W, MATCH_TIME,
} from './config';
import { Game, MENU_ITEMS } from './game';
import { Traffic } from './traffic';
import { sprite, LANE_COLORS } from './sprites';
import {
  drawText, drawTextCentered, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen,
  drawInitialsScreen,
} from '@arcade/shared';

const C = {
  curb: '#9c9c9c',
  curbEdge: '#c8c8c8',
  road: '#4c4c4c',
  lane: '#e8e8e8',
  median: '#f0d000',
  hud: '#000000',
  text: '#dfe6ee',
  dim: '#8a97a6',
  gold: '#ffe14a',
  red: '#ff4a4a',
  green: '#3ddc84',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demo = new Traffic(3, 7);

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
      this.drawRoad();
      this.drawVehicles(this.demo);
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    this.drawRoad();
    this.drawVehicles(g.traffic);
    this.drawChicken(g);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawTimeUp(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- world ----------

  private drawRoad(): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.curb;
    ctx.fillRect(0, HUD_TOP, W, ROAD_Y - HUD_TOP);
    ctx.fillRect(0, ROAD_BOTTOM, W, HUD_BOTTOM - ROAD_BOTTOM);
    ctx.fillStyle = C.curbEdge;
    ctx.fillRect(0, ROAD_Y - 2, W, 2);
    ctx.fillRect(0, ROAD_BOTTOM, W, 2);
    ctx.fillStyle = C.road;
    ctx.fillRect(0, ROAD_Y, W, ROAD_BOTTOM - ROAD_Y);
    ctx.fillStyle = C.lane;
    for (let i = 1; i < 5; i++) {
      const y1 = ROAD_Y + i * LANE_H;
      const y2 = MEDIAN_Y + MEDIAN_H + i * LANE_H;
      for (let x = 0; x < W; x += 16) {
        ctx.fillRect(x, y1 - 1, 8, 1);
        ctx.fillRect(x, y2 - 1, 8, 1);
      }
    }
    ctx.fillStyle = C.median;
    ctx.fillRect(0, MEDIAN_Y + 1, W, 2);
    ctx.fillRect(0, MEDIAN_Y + MEDIAN_H - 3, W, 2);
  }

  private drawVehicles(t: Traffic): void {
    const ctx = this.ctx;
    for (const v of t.vehicles) {
      const s = sprite(v.truck ? 'truck' : 'car', LANE_COLORS[v.lane - 1], v.dir === -1);
      ctx.drawImage(s, Math.round(v.x), Math.round(v.y));
    }
  }

  private drawChicken(g: Game): void {
    const ctx = this.ctx;
    const y = Math.round(g.chickenY);
    if (g.knockT > 0) {
      const flip = Math.floor(g.time * 12) % 2 === 0;
      ctx.drawImage(sprite('chickenHit', '', flip), CHICKEN_X, y);
      return;
    }
    const frame = g.walking && Math.floor(g.walkPhase) % 2 === 1 ? 'chicken1' : 'chicken0';
    ctx.drawImage(sprite(frame), CHICKEN_X, y);
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.hud;
    ctx.fillRect(0, 0, W, HUD_TOP);
    ctx.fillRect(0, HUD_BOTTOM, W, H - HUD_BOTTOM);

    const show = !g.flashing || Math.floor(g.time * 4) % 2 === 0;
    if (show) drawTextCentered(ctx, String(g.score), CHICKEN_X + CHICKEN_W / 2, 4, C.gold, 2);

    const t = Math.max(0, Math.ceil(g.timeLeft));
    const mm = Math.floor(t / 60);
    const ss = String(t % 60).padStart(2, '0');
    drawText(ctx, 'TEMPO', 232, 2, C.dim, 1);
    drawText(ctx, `${mm}:${ss}`, 232, 9, g.flashing ? C.red : C.text, 1);
    const frac = Math.max(0, g.timeLeft / MATCH_TIME);
    ctx.fillStyle = '#2a3340';
    ctx.fillRect(270, 10, 42, 5);
    ctx.fillStyle = g.flashing ? C.red : C.green;
    ctx.fillRect(270, 10, Math.round(42 * frac), 5);

    const s = g.spec;
    drawText(ctx, `JOGO ${s.n}  ${s.name}  ${s.time}`, 8, HUD_BOTTOM + 5, C.dim, 1);
    drawText(ctx, `DIF ${g.difficulty}`, 8, HUD_BOTTOM + 13, C.dim, 1);
    drawText(ctx, `TRAVESSIAS ${g.crossings}  BATIDAS ${g.hits}`, 120, HUD_BOTTOM + 13, C.dim, 1);
  }

  // ---------- screens (shared look, game-specific words) ----------

  private drawMenu(g: Game): void {
    const ctx = this.ctx;
    const bob = Math.round(Math.sin(g.time * 2) * 2);
    ctx.drawImage(sprite('chicken0'), W / 2 - 12, 44 + bob, 24, 24);
    const s = g.spec;
    const itemsY = 76;
    const itemGap = 13;
    drawMenuScreen(ctx, W, H, {
      title: 'FREEWAY', titleColor: C.gold, titleY: 14, subtitle: 'EDICAO BROWSER',
      labels: MENU_ITEMS.map((item) => {
        if (item === 'JOGO') return `JOGO: ${s.n} - ${s.name}`;
        if (item === 'DIFICULDADE') return `DIFICULDADE: ${g.difficulty} (${g.difficulty === 'A' ? 'VOLTA AO INICIO' : 'VOLTA 1 FAIXA'})`;
        return g.shell.label(item);
      }),
      selected: g.menuIndex, time: g.time, itemsY, itemGap,
      footer: ['HOMENAGEM AO CLASSICO DA ACTIVISION (1981)', 'SETAS: NAVEGAR   ENTER OU OK: SELECIONAR'], footerY: 206,
    });
    const item = MENU_ITEMS[g.menuIndex];
    if (item === 'JOGO' || item === 'DIFICULDADE') drawText(ctx, '< >', W - 54, itemsY + g.menuIndex * itemGap, C.gold, 1);
    drawTextCentered(ctx, `${s.place}, ${s.time}${s.random ? '  -  VELOCIDADES ALEATORIAS' : ''}`, W / 2, 172, C.dim, 1);
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'ATRAVESSE AS 10 FAIXAS DA RODOVIA COM A GALINHA.',
      'CADA TRAVESSIA = 1 PONTO. SO CIMA E BAIXO MOVEM.',
      'A PARTIDA DURA 2:16. NOS ULTIMOS 8 SEGUNDOS O PLACAR',
      'PISCA. NO FIM O TRAFEGO PARA.',
      'DIFICULDADE B: ATROPELADA, VOLTA UMA FAIXA.',
      'DIFICULDADE A: VOLTA AO INICIO.',
      'JOGO 1: SO CARROS, TRAFEGO LEVE',
      'JOGO 2: MAIS CARROS, 1 CAMINHAO',
      'JOGO 3: CAMINHOES NO CENTRO, MEIO-FIO LOTADO',
      'JOGO 4: SO CAMINHOES, 3 VELOCIDADES',
      'JOGOS 5 A 8: IGUAIS A 1-4, MAS AS VELOCIDADES',
      'MUDAM A QUALQUER MOMENTO. RANKING POR PONTOS.',
    ]);
  }

  private drawRanking(g: Game, fromMenu: boolean): void {
    const rows = g.highScores.map((h, i) => `${String(i + 1).padStart(2, ' ')}  ${h.initials.padEnd(3, ' ')}  ${String(h.score).padStart(3, ' ')}  ${h.mode || `JOGO ${h.level}`}`);
    drawRankingScreen(this.ctx, W, H, rows, fromMenu, { shell: g.shell });
  }

  private drawPaused(g: Game): void {
    drawPausedScreen(this.ctx, W, H, g.pauseIndex);
  }

  private drawTimeUp(g: Game): void {
    drawGameOverScreen(this.ctx, W, H, {
      title: 'TEMPO ESGOTADO',
      lines: [`${g.score} TRAVESSIAS`, `JOGO ${g.spec.n}  DIFICULDADE ${g.difficulty}  BATIDAS ${g.hits}`],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }

  private drawInitials(g: Game): void {
    drawInitialsScreen(this.ctx, W, H, `${g.score} TRAVESSIAS NO JOGO ${g.spec.n}`, g.initials, g.initialsPos, g.time);
  }
}
