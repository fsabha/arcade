import {
  W, H, HUD_TOP, ROAD_Y, MEDIAN_Y, MEDIAN_H, ROAD_BOTTOM, HUD_BOTTOM, LANE_H, CHICKEN_X, CHICKEN_W, MATCH_TIME,
} from './config';
import { Game, MENU_ITEMS, PAUSE_ITEMS } from './game';
import { Traffic } from './traffic';
import { sprite, LANE_COLORS } from './sprites';
import { drawText, drawTextCentered, textWidth } from './font';

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
    else if (g.state === 'timeup') this.drawTimeUp(g);
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

  // ---------- overlays ----------

  private panel(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6,10,20,0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#3a4452';
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  }

  private drawMenu(g: Game): void {
    const ctx = this.ctx;
    const blink = Math.floor(g.time * 2) % 2 === 0;
    const bob = Math.round(Math.sin(g.time * 2) * 2);
    drawTextCentered(ctx, 'FREEWAY', W / 2 + 2, 14 + 2, '#5a3a00', 3);
    drawTextCentered(ctx, 'FREEWAY', W / 2, 14, C.gold, 3);
    drawTextCentered(ctx, 'EDICAO BROWSER', W / 2, 36, C.dim, 1);
    ctx.drawImage(sprite('chicken0'), W / 2 - 12, 46 + bob, 24, 16);

    const s = g.spec;
    const startY = 76;
    MENU_ITEMS.forEach((item, i) => {
      let label: string = item;
      if (item === 'JOGO') label = `JOGO: ${s.n} - ${s.name}`;
      if (item === 'DIFICULDADE') label = `DIFICULDADE: ${g.difficulty} (${g.difficulty === 'A' ? 'VOLTA AO INICIO' : 'VOLTA 1 FAIXA'})`;
      if (item === 'CRT') label = `CRT: ${g.settings.crt ? 'LIGADO' : 'DESLIGADO'}`;
      if (item === 'SOM') label = `SOM: ${g.settings.sound ? 'LIGADO' : 'DESLIGADO'}`;
      const sel = i === g.menuIndex;
      const y = startY + i * 13;
      if (sel) {
        ctx.fillStyle = 'rgba(255,225,74,0.12)';
        ctx.fillRect(30, y - 4, W - 60, 12);
        if (blink) drawText(ctx, '>', 38, y, C.gold, 1);
        if (item === 'JOGO' || item === 'DIFICULDADE') drawText(ctx, '< >', W - 54, y, C.gold, 1);
      }
      drawTextCentered(ctx, label, W / 2, y, sel ? C.gold : C.text, 1);
    });
    drawTextCentered(ctx, `${s.place}, ${s.time}${s.random ? '  -  VELOCIDADES ALEATORIAS' : ''}`, W / 2, 172, C.dim, 1);
    drawTextCentered(ctx, 'HOMENAGEM AO CLASSICO DA ACTIVISION (1981)', W / 2, 206, C.dim, 1);
    drawTextCentered(ctx, 'SETAS: NAVEGAR   ENTER OU OK: SELECIONAR', W / 2, 220, C.dim, 1);
  }

  private drawHowTo(): void {
    const ctx = this.ctx;
    this.panel(6, 6, W - 12, H - 12);
    drawTextCentered(ctx, 'COMO JOGAR', W / 2, 14, C.gold, 2);
    const left = [
      'ATRAVESSE AS 10 FAIXAS DA',
      'RODOVIA COM A GALINHA.',
      'CADA TRAVESSIA = 1 PONTO.',
      '',
      'SO CIMA E BAIXO MOVEM.',
      '',
      'A PARTIDA DURA 2:16. NOS',
      'ULTIMOS 8 SEGUNDOS O PLACAR',
      'PISCA. NO FIM O TRAFEGO PARA.',
      '',
      'DIFICULDADE B: ATROPELADA,',
      'VOLTA UMA FAIXA.',
      'DIFICULDADE A: VOLTA AO',
      'INICIO.',
    ];
    left.forEach((l, i) => drawText(ctx, l, 14, 34 + i * 9, C.text, 1));
    const right = [
      'JOGOS 1 A 4:',
      '1 SO CARROS, TRAFEGO LEVE',
      '2 MAIS CARROS, 1 CAMINHAO',
      '3 CAMINHOES NO CENTRO,',
      '  MEIO-FIO LOTADO',
      '4 SO CAMINHOES, 3 VELOC.',
      '',
      'JOGOS 5 A 8: IGUAIS A 1-4,',
      'MAS AS VELOCIDADES MUDAM',
      'A QUALQUER MOMENTO.',
      '',
      'RANKING POR PONTOS.',
    ];
    right.forEach((l, i) => drawText(ctx, l, 176, 34 + i * 9, i === 0 || i === 7 ? C.gold : C.dim, 1));
    drawTextCentered(ctx, 'ENTER OU OK: VOLTAR', W / 2, H - 20, C.dim, 1);
  }

  private drawRanking(g: Game, fromMenu: boolean): void {
    const ctx = this.ctx;
    this.panel(6, 6, W - 12, H - 12);
    drawTextCentered(ctx, 'RANKING', W / 2, 14, C.gold, 2);
    if (g.highScores.length === 0) {
      drawTextCentered(ctx, 'SEM RECORDES AINDA', W / 2, 110, C.dim, 1);
    } else {
      drawText(ctx, 'POS  NOME  PONTOS  JOGO', 80, 36, C.dim, 1);
      g.highScores.forEach((h, i) => {
        const y = 48 + i * 13;
        const isNew = !fromMenu && h.initials === g.initials.join('') && h.score === g.score;
        drawText(ctx, `${String(i + 1).padStart(2, ' ')}.  ${h.initials.padEnd(3, ' ')}   ${String(h.score).padStart(3, ' ')}     ${h.level}`, 80, y, isNew ? C.gold : C.text, 1);
      });
    }
    drawTextCentered(ctx, 'ENTER OU OK: VOLTAR', W / 2, H - 20, C.dim, 1);
  }

  private drawPaused(g: Game): void {
    const ctx = this.ctx;
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

  private drawTimeUp(g: Game): void {
    const ctx = this.ctx;
    this.panel(70, 60, W - 140, 100);
    drawTextCentered(ctx, 'TEMPO ESGOTADO', W / 2, 70, C.red, 2);
    drawTextCentered(ctx, `${g.score} TRAVESSIAS`, W / 2, 92, C.gold, 2);
    drawTextCentered(ctx, `JOGO ${g.spec.n}  DIFICULDADE ${g.difficulty}  BATIDAS ${g.hits}`, W / 2, 112, C.dim, 1);
    if (g.stateTime >= 2.5 && Math.floor(g.time * 2) % 2 === 0) {
      drawTextCentered(ctx, g.qualifiesForRank ? 'NOVO RECORDE! ENTER' : 'ENTER OU OK: MENU', W / 2, 136, C.text, 1);
    }
  }

  private drawInitials(g: Game): void {
    const ctx = this.ctx;
    this.panel(50, 40, W - 100, 140);
    drawTextCentered(ctx, 'NOVO RECORDE!', W / 2, 50, C.gold, 2);
    drawTextCentered(ctx, `${g.score} TRAVESSIAS NO JOGO ${g.spec.n}`, W / 2, 68, C.text, 1);
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
    drawTextCentered(ctx, 'ENTER OU OK: CONFIRMAR', W / 2, 158, C.text, 1);
  }
}
