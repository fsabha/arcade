import {
  W, H, HUD_H, GROUND_Y, BOTTOM_HUD_Y, BUGGY_H, LETTERS, LETTER_LEN, CHECKPOINTS, PAR_TIME, CHECKPOINT_BONUS, COURSE_BONUS, POINTS,
  EXTRA_LIVES_AT, UFO_W, letterName,
} from './config';
import { Game, MENU_ITEMS, courseName } from './game';
import { GroundObject } from './course';
import { sprite } from './sprites';
import {
  drawText, drawTextCentered, textWidth, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen,
  drawInitialsScreen,
} from '@arcade/shared';

const C = {
  sky: '#000010', star: '#c0c0ff', far: '#303858', city: '#484870', hills: '#705880', ground: '#b060b0', groundDark: '#703070',
  crater: '#000010', text: '#dfe6ee', dim: '#8a97a6', gold: '#ffe14a', red: '#ff4a4a', shot: '#ffffff', eshot: '#ff8040',
  bar: '#303040', barDone: '#50c050', barMark: '#f0e040',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demoDist = 0;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  draw(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, 0, W, H);

    if (g.state === 'menu' || g.state === 'howto' || g.state === 'ranking') {
      this.demoDist += 1;
      this.drawScenery(this.demoDist, g.time);
      ctx.drawImage(sprite(Math.floor(g.time * 12) % 2 ? 'buggy' : 'buggyWheel1'), 48, GROUND_Y - BUGGY_H);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    this.drawScenery(g.distance, g.time);
    this.drawGround(g);
    this.drawActors(g);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- parallax scenery ----------

  private drawScenery(dist: number, time: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.star;
    for (let i = 0; i < 40; i++) {
      const x = ((i * 61 + 7) - dist * 0.05) % W;
      const y = HUD_H + 4 + ((i * 37) % (GROUND_Y - HUD_H - 70));
      if (Math.floor(time * 3 + i) % 7 !== 0) ctx.fillRect(Math.round((x + W) % W), y, 1, 1);
    }
    // far mountains, city, near hills: three speeds, each with its own baseline
    this.layer(dist * 0.15, 118, 40, C.far, 11);
    this.cityLayer(dist * 0.3, 152);
    this.layer(dist * 0.55, GROUND_Y, 26, C.hills, 7);
  }

  private layer(scroll: number, bottom: number, maxH: number, color: string, seedK: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    const period = 48;
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = i * period - (scroll % period);
      const h = 8 + ((k * seedK + 3) % maxH);
      for (let r = 0; r < h; r++) {
        const half = Math.round(((h - r) / h) * period * 0.6);
        ctx.fillRect(Math.round(x + period / 2 - half), bottom - h + r, half * 2, 1);
      }
    }
  }

  private cityLayer(scroll: number, bottom: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.city;
    const period = 20;
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = i * period - (scroll % period);
      const h = 6 + ((k * 13 + 5) % 26);
      ctx.fillRect(Math.round(x) + 2, bottom - h, period - 6, h);
      ctx.fillStyle = '#9090c0';
      for (let w = 0; w < h - 4; w += 5) ctx.fillRect(Math.round(x) + 5, bottom + 2 - h + w, 2, 2);
      ctx.fillStyle = C.city;
    }
  }

  private drawGround(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, GROUND_Y, W, BOTTOM_HUD_Y - GROUND_Y);
    ctx.fillStyle = C.groundDark;
    for (let i = 0; i < 40; i++) {
      const x = ((i * 23 + 5) - g.distance) % W;
      ctx.fillRect(Math.round((x + W) % W), GROUND_Y + 4 + ((i * 7) % 18), 4, 1);
    }
    for (const o of g.ground) {
      if (!o.alive) continue;
      const x = o.x - g.distance;
      if (x + o.w < 0 || x > W) continue;
      this.drawGroundObject(o, Math.round(x));
    }
  }

  private drawGroundObject(o: GroundObject, x: number): void {
    const ctx = this.ctx;
    switch (o.kind) {
      case 'crater':
      case 'bigCrater':
        ctx.fillStyle = C.crater;
        ctx.fillRect(x, GROUND_Y, o.w, 12);
        ctx.fillRect(x + 3, GROUND_Y + 12, o.w - 6, 6);
        ctx.fillStyle = C.groundDark;
        ctx.fillRect(x - 2, GROUND_Y - 2, 3, 2);
        ctx.fillRect(x + o.w - 1, GROUND_Y - 2, 3, 2);
        break;
      case 'rock': ctx.drawImage(sprite('rock'), x, GROUND_Y - 6); break;
      case 'bigRock': ctx.drawImage(sprite('bigRock'), x, GROUND_Y - 8); break;
      case 'mine': ctx.drawImage(sprite('mine'), x, GROUND_Y - 8); break;
      case 'tank': ctx.drawImage(sprite('tank'), x, GROUND_Y - 8); break;
    }
  }

  private drawActors(g: Game): void {
    const ctx = this.ctx;
    const b = g.buggy;
    const bx = Math.round(g.buggyScreenX);
    const by = Math.round(GROUND_Y - BUGGY_H - g.lift);
    if (b.alive) {
      ctx.drawImage(sprite(Math.floor(b.phase) % 2 ? 'buggy' : 'buggyWheel1'), bx, by);
    } else if (g.death === 'crater') {
      const k = Math.min(1, g.deathT / 0.6);
      ctx.drawImage(sprite('buggy'), bx, Math.round(by + k * 16));
    } else if (Math.floor(g.deathT * 8) % 2 === 0) {
      ctx.drawImage(sprite('wreck'), bx, by);
    }
    for (const u of g.ufos) {
      const name = u.kind === 'small' ? 'ufoSmall' : u.kind === 'big' ? 'ufoBig' : 'ufoFast';
      ctx.drawImage(sprite(name), Math.round(u.x - g.distance - UFO_W / 2), Math.round(u.y - 3));
    }
    for (const bo of g.bombs) ctx.drawImage(sprite('bomb'), Math.round(bo.x - g.distance - 1), Math.round(bo.y));
    ctx.fillStyle = C.shot;
    for (const s of g.shots) {
      const x = Math.round(s.x - g.distance);
      if (s.vy < 0) ctx.fillRect(x, Math.round(s.y), 1, 4);
      else ctx.fillRect(x, Math.round(s.y), 4, 1);
    }
    ctx.fillStyle = C.eshot;
    for (const s of g.enemyShots) ctx.fillRect(Math.round(s.x - g.distance), Math.round(s.y), 4, 2);
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, HUD_H);
    drawText(ctx, '1UP', 6, 2, C.dim);
    drawText(ctx, String(g.score).padStart(6, '0'), 6, 9, C.text, 2);
    const hi = Math.max(g.score, g.highScores[0]?.score ?? 0);
    drawText(ctx, 'RECORDE', W - 6 - textWidth('RECORDE'), 2, C.dim);
    drawText(ctx, String(hi).padStart(6, '0'), W - 6 - textWidth('000000', 2), 9, C.text, 2);

    // course bar A..Z with the checkpoints marked
    const x0 = 72;
    const bw = W - 144;
    ctx.fillStyle = C.bar;
    ctx.fillRect(x0, 4, bw, 6);
    const done = Math.min(1, g.buggyWorldX / (LETTERS * LETTER_LEN));
    ctx.fillStyle = C.barDone;
    ctx.fillRect(x0, 4, Math.round(bw * done), 6);
    ctx.fillStyle = C.barMark;
    for (const c of CHECKPOINTS) ctx.fillRect(x0 + Math.round((bw * c) / LETTERS), 2, 1, 10);
    drawTextCentered(ctx, `${letterName(g.letter)}  ${g.course === 'champion' ? 'CAMPEAO' : 'INICIANTE'}`, W / 2, 14, C.gold);
    drawTextCentered(ctx, `TEMPO ${Math.floor(g.sectionTime)}`, W / 2, 21, g.sectionTime > PAR_TIME ? C.red : C.dim);

    // bottom: lives
    ctx.fillStyle = '#000';
    ctx.fillRect(0, BOTTOM_HUD_Y, W, H - BOTTOM_HUD_Y);
    for (let i = 0; i < g.lives - 1; i++) ctx.drawImage(sprite('life'), 6 + i * 16, BOTTOM_HUD_Y + 6);
    drawText(ctx, `PERCURSOS ${g.coursesDone}`, W - 6 - textWidth('PERCURSOS 0'), BOTTOM_HUD_Y + 7, C.dim);

    if (g.bonusShown > 0) drawTextCentered(ctx, `PONTO DE CONTROLE  +${g.lastBonus}`, W / 2, 60, C.gold);
  }

  // ---------- screens (shared look, game-specific words) ----------

  private drawMenu(g: Game): void {
    drawMenuScreen(this.ctx, W, H, {
      title: 'MOON PATROL', titleColor: '#e060e0', titleY: 34, subtitle: 'PATRULHE A LUA DE A ATE Z',
      labels: MENU_ITEMS.map((item) => (item === 'PERCURSO' ? `PERCURSO: ${courseName(g.course)}` : g.shell.label(item))),
      selected: g.menuIndex, time: g.time, itemsY: 80,
      footer: ['DIREITA ACELERA  ESQUERDA FREIA', 'CIMA PULA  ESPACO ATIRA', 'IREM 1982  EDICAO BROWSER'], footerY: 166,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'O JIPE ANDA SOZINHO: ACELERE OU FREIE',
      'PULE AS CRATERAS (AS GRANDES SO ACELERANDO)',
      'O TIRO SAI PARA CIMA E PARA FRENTE',
      `PEDRA ${POINTS.rock}  PEDRA GRANDE ${POINTS.bigRock} (2 TIROS)`,
      `MINA ${POINTS.mine}  TANQUE ${POINTS.tank}`,
      `OVNI ${POINTS.ufoSmall} / ${POINTS.ufoBig} / ${POINTS.ufoFast}`,
      'BOMBAS DE OVNI ABREM CRATERAS NOVAS',
      `PONTOS DE CONTROLE E J O T Z: ${CHECKPOINT_BONUS}`,
      `(METADE SE PASSAR DE ${PAR_TIME} SEGUNDOS)`,
      `PERCURSO COMPLETO ${COURSE_BONUS} E VEM O CAMPEAO`,
      'MORREU: VOLTA AO INICIO DA SECAO',
      `VIDA EXTRA EM ${EXTRA_LIVES_AT.join(' ')}`,
    ], { y0: 46, gap: 11 });
  }

  private drawRanking(g: Game, menu: boolean): void {
    const rows = g.highScores.map((h, i) => {
      const mode = h.mode ? ` ${h.mode}` : '';
      return `${String(i + 1).padStart(2, ' ')} ${h.initials.padEnd(3, ' ')} ${String(h.score).padStart(6, ' ')} LETRA ${String(h.course).padStart(2, ' ')}${mode}`;
    });
    drawRankingScreen(this.ctx, W, H, rows, menu, { y0: 50 });
  }

  private drawPaused(g: Game): void {
    drawPausedScreen(this.ctx, W, H, g.pauseIndex);
  }

  private drawGameOver(g: Game): void {
    drawGameOverScreen(this.ctx, W, H, {
      lines: [`PONTOS ${g.score}`, `LETRA ${letterName(g.letter)}  PERCURSOS ${g.coursesDone}`, courseName(g.startedOn)],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }

  private drawInitials(g: Game): void {
    drawInitialsScreen(this.ctx, W, H, `${g.score} PONTOS`, g.initials, g.initialsPos, g.time);
  }
}
