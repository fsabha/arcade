import {
  W, H, TILE, ROW_HOME, ROW_RIVER_TOP, ROW_RIVER_BOTTOM, ROW_MEDIAN, ROW_ROAD_TOP, ROW_ROAD_BOTTOM, ROW_START, ROW_BOTTOM, HOME_X,
  TIME_LIMIT, TIME_WARN, POINTS, EXTRA_LIFE_AT, rowY,
} from './config';
import { Game, MENU_ITEMS, PAUSE_ITEMS } from './game';
import { Traffic, submersion, Mover } from './lanes';
import { sprite } from './sprites';
import { drawText, drawTextCentered, textWidth } from '@arcade/shared';

const C = {
  bg: '#000000', river: '#00008c', bank: '#00a800', bay: '#000080', bayWall: '#20c020', median: '#b000b0', road: '#000000',
  lane: '#e0e0e0', sidewalk: '#b000b0', text: '#dfe6ee', dim: '#8a97a6', gold: '#ffe14a', red: '#ff4a4a', time: '#40e040', timeLow: '#ff4040',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demo = new Traffic(1, 4);

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  draw(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    if (g.state === 'menu' || g.state === 'howto' || g.state === 'ranking') {
      this.demo.update(1 / 60);
      this.drawField(this.demo, Array(5).fill(false), g.time);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    this.drawField(g.traffic, g.homes, g.time, g);
    this.drawFrog(g);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- the field ----------

  private drawField(traffic: Traffic, homes: boolean[], time: number, g: Game | null = null): void {
    const ctx = this.ctx;
    // river and the bank with five bays
    ctx.fillStyle = C.river;
    ctx.fillRect(0, rowY(ROW_HOME), W, rowY(ROW_RIVER_BOTTOM + 1) - rowY(ROW_HOME));
    ctx.fillStyle = C.bank;
    ctx.fillRect(0, rowY(ROW_HOME), W, TILE);
    HOME_X.forEach((x, i) => {
      ctx.fillStyle = C.bay;
      ctx.fillRect(x, rowY(ROW_HOME), TILE, TILE);
      ctx.fillStyle = C.bayWall;
      ctx.fillRect(x - 2, rowY(ROW_HOME), 2, TILE);
      ctx.fillRect(x + TILE, rowY(ROW_HOME), 2, TILE);
      if (homes[i]) ctx.drawImage(sprite('frogHome'), x, rowY(ROW_HOME));
      else if (g) {
        if (g.fly.bay === i) ctx.drawImage(sprite('fly'), x, rowY(ROW_HOME));
        if (g.homeCroc.bay === i) ctx.drawImage(sprite(g.homeCroc.open ? 'crocJaws' : 'homeCroc'), x, rowY(ROW_HOME));
      }
    });
    // median and road
    ctx.fillStyle = C.median;
    ctx.fillRect(0, rowY(ROW_MEDIAN), W, TILE);
    ctx.fillStyle = C.road;
    ctx.fillRect(0, rowY(ROW_ROAD_TOP), W, rowY(ROW_ROAD_BOTTOM + 1) - rowY(ROW_ROAD_TOP));
    ctx.fillStyle = C.lane;
    for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOTTOM; r++) {
      for (let x = 0; x < W; x += 16) ctx.fillRect(x + 2, rowY(r) - 1, 8, 1);
    }
    ctx.fillStyle = C.sidewalk;
    ctx.fillRect(0, rowY(ROW_START), W, TILE);

    for (const m of traffic.movers) this.drawMover(m, time);

    // the lady frog waiting on her log
    if (g && g.lady.active && !g.lady.taken && g.lady.platform) {
      const p = g.lady.platform;
      ctx.drawImage(sprite('lady'), Math.round(p.x + g.lady.offset), rowY(p.row));
    }
  }

  private drawMover(m: Mover, time: number): void {
    const ctx = this.ctx;
    const y = rowY(m.row);
    const x = Math.round(m.x);
    if (x + m.w < 0 || x > W) return;
    const flip = m.dir > 0;
    switch (m.kind) {
      case 'car': ctx.drawImage(sprite(m.row === 11 ? 'carPink' : 'car', flip), x, y); break;
      case 'dozer': ctx.drawImage(sprite('dozer', flip), x, y); break;
      case 'racer': ctx.drawImage(sprite('racer', flip), x, y); break;
      case 'truck': ctx.drawImage(sprite('truck', flip), x, y); break;
      case 'log': {
        const n = m.w / TILE;
        for (let i = 0; i < n; i++) ctx.drawImage(sprite(i === 0 ? 'logL' : i === n - 1 ? 'logR' : 'logM'), x + i * TILE, y);
        break;
      }
      case 'turtle': {
        const s = submersion(m);
        if (s >= 0.99) break;
        const name = s > 0.4 ? 'turtleDown' : 'turtle';
        const n = m.w / TILE;
        for (let i = 0; i < n; i++) ctx.drawImage(sprite(name, flip), x + i * TILE, y);
        break;
      }
      case 'croc': {
        const n = m.w / TILE;
        const jaws = Math.floor(m.phase) % 3 === 0;
        for (let i = 0; i < n; i++) {
          const head = flip ? i === n - 1 : i === 0;
          ctx.drawImage(sprite(head ? (jaws ? 'crocJaws' : 'crocHead') : 'crocBody', flip), x + i * TILE, y);
        }
        break;
      }
      case 'snake': ctx.drawImage(sprite('snake', !flip), x, y); break;
      case 'otter': ctx.drawImage(sprite('otter', flip), x, y + (Math.floor(time * 2) % 2 ? 2 : 0)); break;
    }
  }

  private drawFrog(g: Game): void {
    const ctx = this.ctx;
    const f = g.frog;
    if (f.mode === 'home' || f.mode === 'clear') return;
    const x = Math.round(f.x);
    const y = rowY(f.mode === 'hop' ? f.fromRow + (f.toRow - f.fromRow) * Math.min(1, f.t / 0.1) : f.row);
    if (f.mode === 'dead') {
      if (Math.floor(f.t * 6) % 2 === 0) ctx.drawImage(sprite(g.death === 'drown' ? 'drown' : 'splat'), x, Math.round(y));
      return;
    }
    const s = sprite(f.mode === 'hop' ? 'frogHop' : 'frogUp');
    ctx.save();
    ctx.translate(x + TILE / 2, Math.round(y) + TILE / 2);
    ctx.rotate((f.facing * Math.PI) / 2);
    ctx.drawImage(s, -TILE / 2, -TILE / 2);
    if (f.carryingLady) ctx.drawImage(sprite('lady'), -TILE / 2, -TILE / 2 - 6);
    ctx.restore();
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, rowY(ROW_HOME));
    drawText(ctx, '1UP', 24, 2, C.text);
    drawText(ctx, String(g.score).padStart(6, '0'), 8, 10, C.red, 2);
    const hi = Math.max(g.score, g.highScores[0]?.score ?? 0);
    drawText(ctx, 'RECORDE', W - 8 - textWidth('RECORDE'), 2, C.text);
    drawText(ctx, String(hi).padStart(6, '0'), W - 8 - textWidth('000000', 2), 10, C.red, 2);

    // bottom: lives, level, time bar
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, rowY(ROW_BOTTOM), W, TILE);
    for (let i = 0; i < g.lives - 1; i++) ctx.drawImage(sprite('life'), 4 + i * 14, rowY(ROW_BOTTOM) + 2);
    drawText(ctx, `NIVEL ${g.level}`, 70, rowY(ROW_BOTTOM) + 4, C.dim);
    const barW = 120;
    const k = Math.max(0, g.timeLeft / TIME_LIMIT);
    ctx.fillStyle = g.timeLeft <= TIME_WARN && Math.floor(g.time * 4) % 2 === 0 ? C.timeLow : C.time;
    ctx.fillRect(W - 24 - barW + Math.round(barW * (1 - k)), rowY(ROW_BOTTOM) + 4, Math.round(barW * k), 8);
    drawText(ctx, 'TEMPO', W - 22, rowY(ROW_BOTTOM) + 5, C.gold);

    if (g.frog.mode === 'home' && g.lastHomeBonus) drawTextCentered(ctx, `+${g.lastHomeBonus}`, g.frog.x + TILE / 2, rowY(ROW_HOME) - 10, C.gold);
    if (g.frog.mode === 'clear') drawTextCentered(ctx, `TODOS EM CASA  +${POINTS.allHome}`, W / 2, rowY(ROW_MEDIAN) + 4, C.gold);
  }

  // ---------- screens ----------

  private drawMenu(g: Game): void {
    const ctx = this.ctx;
    drawTextCentered(ctx, 'FROGGER', W / 2, 36, '#40d040', 4);
    drawTextCentered(ctx, 'LEVE OS CINCO SAPOS PARA CASA', W / 2, 66, C.dim);
    MENU_ITEMS.forEach((item, i) => {
      const y = 100 + i * 14;
      let label: string = item;
      if (item === 'CRT') label = `CRT: ${g.settings.crt ? 'LIGADO' : 'DESLIGADO'}`;
      if (item === 'SOM') label = `SOM: ${g.settings.sound ? 'LIGADO' : 'DESLIGADO'}`;
      const sel = i === g.menuIndex;
      if (sel && Math.floor(g.time * 4) % 2 === 0) drawText(ctx, '>', W / 2 - textWidth(label) / 2 - 10, y, C.gold);
      drawTextCentered(ctx, label, W / 2, y, sel ? C.gold : C.text);
    });
    drawTextCentered(ctx, 'SETAS PULAM', W / 2, 200, C.dim);
    drawTextCentered(ctx, 'KONAMI SEGA 1981  EDICAO BROWSER', W / 2, 214, C.dim);
  }

  private drawHowTo(): void {
    const ctx = this.ctx;
    drawTextCentered(ctx, 'COMO JOGAR', W / 2, 26, C.gold, 2);
    const lines = [
      'ATRAVESSE A ESTRADA E O RIO',
      'E ENTRE EM CADA UMA DAS 5 CASAS',
      `PULO PARA FRENTE ${POINTS.hop}  CASA ${POINTS.home}`,
      `MAIS ${POINTS.halfSecond} POR MEIO SEGUNDO SOBRANDO`,
      `MOSCA NA CASA ${POINTS.fly}  SAPA LEVADA ${POINTS.lady}`,
      `CINCO EM CASA ${POINTS.allHome} E PROXIMO NIVEL`,
      'NO RIO SO PISE EM TRONCOS E TARTARUGAS',
      'TARTARUGAS QUE MERGULHAM AFOGAM',
      'JACARE: BOCA MATA  COBRA E LONTRA MATAM',
      'CASA OCUPADA OU PAREDE: MORTE',
      `${TIME_LIMIT} SEGUNDOS POR SAPO`,
      `SAPO EXTRA COM ${EXTRA_LIFE_AT} PONTOS`,
    ];
    lines.forEach((l, i) => drawTextCentered(ctx, l, W / 2, 56 + i * 12, C.text));
    drawTextCentered(ctx, 'ENTER VOLTA', W / 2, 220, C.dim);
  }

  private drawRanking(g: Game, menu: boolean): void {
    const ctx = this.ctx;
    drawTextCentered(ctx, 'RANKING', W / 2, 26, C.gold, 2);
    if (g.highScores.length === 0) drawTextCentered(ctx, 'NENHUM REGISTRO AINDA', W / 2, 100, C.dim);
    g.highScores.forEach((h, i) => {
      const y = 56 + i * 12;
      const line = `${String(i + 1).padStart(2, ' ')} ${h.initials.padEnd(3, ' ')} ${String(h.score).padStart(6, ' ')} NIV ${String(h.level).padStart(2, ' ')}`;
      drawTextCentered(ctx, line, W / 2, y, i === 0 ? C.gold : C.text);
    });
    drawTextCentered(ctx, menu ? 'ENTER VOLTA' : 'ENTER CONTINUA', W / 2, 220, C.dim);
  }

  private drawPaused(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'PAUSA', W / 2, 90, C.gold, 2);
    PAUSE_ITEMS.forEach((item, i) => {
      drawTextCentered(ctx, item, W / 2, 126 + i * 14, i === g.pauseIndex ? C.gold : C.text);
    });
  }

  private drawGameOver(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 70, W, 110);
    drawTextCentered(ctx, 'FIM DE JOGO', W / 2, 84, C.red, 2);
    drawTextCentered(ctx, `PONTOS ${g.score}`, W / 2, 110, C.text);
    drawTextCentered(ctx, `NIVEL ${g.level}  SAPOS EM CASA ${g.frogsHome}`, W / 2, 122, C.text);
    if (g.stateTime >= 2) drawTextCentered(ctx, g.qualifiesForRank ? 'ENTER PARA REGISTRAR' : 'ENTER PARA CONTINUAR', W / 2, 160, C.gold);
  }

  private drawInitials(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'NOVO RECORDE', W / 2, 60, C.gold, 2);
    drawTextCentered(ctx, `${g.score} PONTOS`, W / 2, 86, C.text);
    drawTextCentered(ctx, 'SUAS INICIAIS', W / 2, 106, C.dim);
    const scale = 3;
    const cw = 4 * scale;
    const x0 = W / 2 - (3 * cw + 2 * 6) / 2;
    g.initials.forEach((ch, i) => {
      const x = x0 + i * (cw + 6);
      const sel = i === g.initialsPos;
      drawText(ctx, ch, x, 122, sel ? C.gold : C.text, scale);
      if (sel && Math.floor(g.time * 4) % 2 === 0) { ctx.fillStyle = C.gold; ctx.fillRect(x, 122 + 5 * scale + 2, 3 * scale, 2); }
    });
    drawTextCentered(ctx, 'CIMA BAIXO MUDAM', W / 2, 170, C.dim);
    drawTextCentered(ctx, 'ENTER CONFIRMA', W / 2, 182, C.dim);
  }
}

export { ROW_RIVER_TOP };
