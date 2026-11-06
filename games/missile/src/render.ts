import {
  W, H, HUD_H, GROUND_Y, BASE_X, CITY_X, CITY_W, CITY_H, PX, ABMS_LOADED, POINTS, BONUS_CITY_EVERY, ABMS_PER_WAVE,
  MAX_ABMS_FLYING, CRUISE_FROM_WAVE, WAVE_START_TIME,
} from './config';
import { Game, MENU_ITEMS, PAUSE_ITEMS } from './game';
import { Field, explosionRadius } from './field';
import { describeGame } from './games';
import { drawText, drawTextCentered, textWidth } from '@arcade/shared';

// the cartridge recolours the sky every wave
const SKIES = ['#101828', '#201030', '#102018', '#301810', '#181030', '#102830'];
const GROUNDS = ['#d87020', '#c86030', '#b08030', '#d05030', '#c07040', '#a08040'];
const FLICKER = ['#ffffff', '#ffe040', '#ff4040', '#ff40ff', '#40a0ff', '#ffffff'];
const C = {
  city: '#48a8e8', cityDark: '#2868a8', ruin: '#784830', base: '#e8b060', abm: '#78c8ff', abmHead: '#ffffff',
  icbm: '#ff5050', icbmHead: '#ffffff', cruise: '#c0ff60', cursor: '#ffffff',
  text: '#dfe6ee', dim: '#8a97a6', gold: '#ffe14a', red: '#ff4a4a', score: '#ff70c0',
};

const CITY_SHAPE = ['..#...#...', '.###..##.#', '.###.####.', '##########', '##########']; // 10x5 Atari pixels (20x5 px)

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demo = new Field(1, false, false, 3);
  private demoCities = Array(6).fill(true) as boolean[];

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
      this.demo.update(1 / 60, this.demoCities);
      if (this.demo.icbms.length < 3 && Math.random() < 0.02) this.demo.launchIcbm(this.demoCities);
      if (Math.random() < 0.015) this.demo.explode(20 + Math.random() * 280, 50 + Math.random() * 120);
      this.drawSky(this.demo, 1, 0, this.demoCities, g.time, null);
      ctx.fillStyle = 'rgba(0,0,0,0.66)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    this.drawSky(g.field, g.wave, g.phase === 'start' ? Math.min(1, g.phaseTime / WAVE_START_TIME) : 1, g.cities, g.time, g);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- the sky and the ground ----------

  private drawSky(field: Field, wave: number, rise: number, cities: boolean[], time: number, g: Game | null): void {
    const ctx = this.ctx;
    const pal = (wave - 1) % SKIES.length;
    ctx.fillStyle = SKIES[pal];
    ctx.fillRect(0, HUD_H, W, GROUND_Y - HUD_H);
    ctx.fillStyle = GROUNDS[pal];
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    // the base mound
    ctx.fillStyle = C.base;
    ctx.fillRect(BASE_X - 10, GROUND_Y - 3, 20, 3);
    ctx.fillRect(BASE_X - 6, GROUND_Y - 5, 12, 2);
    ctx.fillRect(BASE_X - 2, GROUND_Y - 7, 4, 2);

    // cities sink and rise between waves
    const sink = Math.round((1 - rise) * 8);
    cities.forEach((alive, i) => {
      const x = CITY_X[i] - CITY_W / 2;
      const y = GROUND_Y - CITY_H + 3 + sink;
      if (!alive) {
        ctx.fillStyle = C.ruin;
        ctx.fillRect(x + 2, GROUND_Y - 2, CITY_W - 4, 2);
        return;
      }
      CITY_SHAPE.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          if (row[c] !== '#') continue;
          ctx.fillStyle = r >= 3 ? C.cityDark : C.city;
          ctx.fillRect(x + c * PX, y + r, PX, 1);
        }
      });
    });
    // ground covers whatever sank
    ctx.fillStyle = GROUNDS[pal];
    ctx.fillRect(0, GROUND_Y + 1, W, 4);

    // enemy trails
    for (const m of field.icbms) {
      this.line(m.x0, m.y0, m.x, m.y, C.icbm);
      ctx.fillStyle = C.icbmHead;
      ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 2, 2);
    }
    for (const c of field.cruises) {
      ctx.fillStyle = C.cruise;
      for (let i = 0; i < c.trail.length; i += 3) ctx.fillRect(Math.round(c.trail[i].x), Math.round(c.trail[i].y), 1, 1);
      // satellite-looking body
      ctx.fillRect(Math.round(c.x) - 4, Math.round(c.y) - 1, 8, 2);
      ctx.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 3, 2, 6);
    }
    // ABMs
    for (const a of field.abms) {
      this.line(BASE_X, GROUND_Y, a.x, a.y, C.abm);
      ctx.fillStyle = C.abmHead;
      ctx.fillRect(Math.round(a.x) - 1, Math.round(a.y) - 1, 2, 2);
      ctx.fillRect(Math.round(a.tx) - 2, Math.round(a.ty), 5, 1);
      ctx.fillRect(Math.round(a.tx), Math.round(a.ty) - 2, 1, 5);
    }
    // explosions flicker like the TIA
    for (const e of field.explosions) {
      const r = explosionRadius(e);
      if (r <= 0) continue;
      ctx.fillStyle = FLICKER[Math.floor(time * 30 + e.x) % FLICKER.length];
      this.disc(e.x, e.y, r);
    }

    if (g && g.state === 'playing' && g.phase === 'wave' && Math.floor(time * 6) % 3 !== 0) {
      ctx.fillStyle = C.cursor;
      const cx = Math.round(g.cursor.x);
      const cy = Math.round(g.cursor.y);
      ctx.fillRect(cx - 4, cy, 9, 1);
      ctx.fillRect(cx, cy - 4, 1, 9);
    }
  }

  private line(x0: number, y0: number, x1: number, y1: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    for (let i = 0; i <= n; i++) {
      ctx.fillRect(Math.round(x0 + (dx * i) / n), Math.round(y0 + (dy * i) / n), 1, 1);
    }
  }

  /** Filled circle in 2px-wide scanlines, like the cartridge's chunky blasts. */
  private disc(cx: number, cy: number, r: number): void {
    const ctx = this.ctx;
    for (let y = -r; y <= r; y += 1) {
      const half = Math.sqrt(Math.max(0, r * r - y * y));
      ctx.fillRect(Math.round(cx - half), Math.round(cy + y), Math.round(half * 2), 1);
    }
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, HUD_H);
    drawTextCentered(ctx, String(g.score).padStart(6, '0'), W / 2, 3, C.score, 2);
    drawText(ctx, `ONDA ${g.wave}`, 6, 3, C.dim);
    drawText(ctx, `X${g.multiplier}`, 6, 10, C.dim);
    const cities = `CIDADES ${g.citiesAlive}`;
    drawText(ctx, cities, W - 6 - textWidth(cities), 3, C.dim);
    if (g.bonusCities > 0) drawText(ctx, `BONUS ${g.bonusCities}`, W - 6 - textWidth(`BONUS ${g.bonusCities}`), 10, C.gold);

    // ABMs: the loaded ten in the base, the dump bottom left
    ctx.fillStyle = C.abm;
    for (let i = 0; i < g.loaded; i++) ctx.fillRect(BASE_X - 10 + (i % 5) * 4, GROUND_Y + 8 + Math.floor(i / 5) * 4, 2, 3);
    ctx.fillStyle = C.abmHead;
    for (let i = 0; i < g.dump; i++) ctx.fillRect(8 + (i % 10) * 4, GROUND_Y + 8 + Math.floor(i / 10) * 4, 2, 3);
    if (g.baseDown > 0 && Math.floor(g.time * 8) % 2 === 0) drawTextCentered(ctx, 'BASE ATINGIDA', BASE_X, GROUND_Y + 22, C.red);

    if (g.phase === 'start') {
      drawTextCentered(ctx, `ONDA ${g.wave}`, W / 2, 96, C.gold, 2);
      if (g.bonusUsedThisWave > 0) drawTextCentered(ctx, 'CIDADE BONUS RECONSTRUIDA', W / 2, 116, C.text);
    } else if (g.phase === 'tally') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(60, 80, 200, 56);
      drawTextCentered(ctx, 'FIM DA ONDA', W / 2, 86, C.gold);
      drawTextCentered(ctx, `ABM ${g.tallyAbms} X ${POINTS.abm * g.multiplier}`, W / 2, 102, C.text);
      drawTextCentered(ctx, `CIDADES ${g.tallyCities} X ${POINTS.city * g.multiplier}`, W / 2, 114, C.text);
    }
  }

  // ---------- screens ----------

  private drawMenu(g: Game): void {
    const ctx = this.ctx;
    drawTextCentered(ctx, 'MISSILE COMMAND', W / 2, 30, '#ff7050', 3);
    drawTextCentered(ctx, 'DEFENDA AS SEIS CIDADES DE ZARDON', W / 2, 52, C.dim);
    MENU_ITEMS.forEach((item, i) => {
      const y = 74 + i * 12;
      let label: string = item;
      if (item === 'JOGO') label = `JOGO ${g.gameNumber}: ${describeGame(g.spec)}`;
      if (item === 'DIFICULDADE') label = `DIFICULDADE: ${g.difficulty === 'A' ? 'A (ABM LENTO)' : 'B (NORMAL)'}`;
      if (item === 'CRT') label = `CRT: ${g.settings.crt ? 'LIGADO' : 'DESLIGADO'}`;
      if (item === 'SOM') label = `SOM: ${g.settings.sound ? 'LIGADO' : 'DESLIGADO'}`;
      const sel = i === g.menuIndex;
      if (sel && Math.floor(g.time * 4) % 2 === 0) drawText(ctx, '>', W / 2 - textWidth(label) / 2 - 10, y, C.gold);
      drawTextCentered(ctx, label, W / 2, y, sel ? C.gold : C.text);
    });
    drawTextCentered(ctx, 'SETAS MOVEM A MIRA  ESPACO DISPARA', W / 2, 178, C.dim);
    drawTextCentered(ctx, 'TOQUE OU CLIQUE NO CEU TAMBEM DISPARA', W / 2, 190, C.dim);
    drawTextCentered(ctx, 'ATARI 1981  EDICAO BROWSER', W / 2, 202, C.dim);
  }

  private drawHowTo(): void {
    const ctx = this.ctx;
    drawTextCentered(ctx, 'COMO JOGAR', W / 2, 26, C.gold, 2);
    const lines = [
      'MISSEIS INIMIGOS CAEM SOBRE AS CIDADES E A BASE',
      'MOVA A MIRA E DISPARE: O ABM EXPLODE NA MIRA',
      `ATE ${MAX_ABMS_FLYING} ABMS NO AR  ${ABMS_PER_WAVE} POR ONDA (${ABMS_LOADED} NA BASE)`,
      `MISSIL ${POINTS.icbm}  CRUZEIRO ${POINTS.cruise}  (X MULTIPLICADOR)`,
      'ONDAS 1-2 X1  3-4 X2  5-6 X3 ... 11+ X6',
      `FIM DA ONDA: ABM SOBRANDO ${POINTS.abm}  CIDADE SALVA ${POINTS.city}`,
      `CIDADE BONUS A CADA ${BONUS_CITY_EVERY} PONTOS`,
      `CRUZEIROS A PARTIR DA ONDA ${CRUISE_FROM_WAVE}: ESPERTOS DESVIAM`,
      'BASE ATINGIDA PERDE OS ABMS CARREGADOS',
      'FIM DE JOGO QUANDO AS SEIS CIDADES CAEM',
    ];
    lines.forEach((l, i) => drawTextCentered(ctx, l, W / 2, 50 + i * 12, C.text));
    drawTextCentered(ctx, 'ENTER VOLTA', W / 2, 200, C.dim);
  }

  private drawRanking(g: Game, menu: boolean): void {
    const ctx = this.ctx;
    drawTextCentered(ctx, 'RANKING', W / 2, 26, C.gold, 2);
    if (g.highScores.length === 0) drawTextCentered(ctx, 'NENHUM REGISTRO AINDA', W / 2, 100, C.dim);
    g.highScores.forEach((h, i) => {
      const y = 52 + i * 12;
      const line = `${String(i + 1).padStart(2, ' ')}  ${h.initials.padEnd(3, ' ')}  ${String(h.score).padStart(6, ' ')}  ONDA ${String(h.wave).padStart(2, ' ')}`;
      drawTextCentered(ctx, line, W / 2, y, i === 0 ? C.gold : C.text);
    });
    drawTextCentered(ctx, menu ? 'ENTER VOLTA' : 'ENTER CONTINUA', W / 2, 200, C.dim);
  }

  private drawPaused(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'PAUSA', W / 2, 80, C.gold, 2);
    PAUSE_ITEMS.forEach((item, i) => {
      drawTextCentered(ctx, item, W / 2, 116 + i * 14, i === g.pauseIndex ? C.gold : C.text);
    });
  }

  private drawGameOver(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 60, W, 110);
    // the cartridge ends on a big flashing THE END
    drawTextCentered(ctx, 'FIM', W / 2, 70, FLICKER[Math.floor(g.time * 8) % FLICKER.length], 4);
    drawTextCentered(ctx, `PONTOS ${g.score}`, W / 2, 104, C.text);
    drawTextCentered(ctx, `ONDA ${g.wave}  JOGO ${g.gameNumber}`, W / 2, 116, C.text);
    if (g.stateTime >= 2) drawTextCentered(ctx, g.qualifiesForRank ? 'ENTER PARA REGISTRAR' : 'ENTER PARA CONTINUAR', W / 2, 150, C.gold);
  }

  private drawInitials(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'NOVO RECORDE', W / 2, 50, C.gold, 2);
    drawTextCentered(ctx, `${g.score} PONTOS`, W / 2, 76, C.text);
    drawTextCentered(ctx, 'SUAS INICIAIS', W / 2, 96, C.dim);
    const scale = 3;
    const cw = 4 * scale;
    const x0 = W / 2 - (3 * cw + 2 * 6) / 2;
    g.initials.forEach((ch, i) => {
      const x = x0 + i * (cw + 6);
      const sel = i === g.initialsPos;
      drawText(ctx, ch, x, 112, sel ? C.gold : C.text, scale);
      if (sel && Math.floor(g.time * 4) % 2 === 0) { ctx.fillStyle = C.gold; ctx.fillRect(x, 112 + 5 * scale + 2, 3 * scale, 2); }
    });
    drawTextCentered(ctx, 'CIMA BAIXO MUDAM  ENTER CONFIRMA', W / 2, 160, C.dim);
  }
}
