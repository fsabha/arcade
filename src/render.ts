import {
  W, H, PLAY_H, HUD_H, HORIZON, SEG_LEN, NEAR_Z, PLAYER_Z_OFF, DRAW_SEGS, ROAD_HALF, CAR_W, DAY_LEN,
  QUOTA_DAY1, QUOTA_NEXT,
} from './config';
import { Road } from './road';
import type { Car } from './traffic';
import { Conditions, conditionsAt, css, fogAmount, Rgb } from './daycycle';
import { project, screenWidth } from './projection';
import { Game, MENU_ITEMS, PAUSE_ITEMS } from './game';
import { carSprite, playerSprite, sprite } from './sprites';
import { drawText, drawTextCentered, textWidth } from './font';
import { Rng } from './rng';

const C = {
  hud: '#0f1318',
  hudLine: '#3a4452',
  text: '#dfe6ee',
  dim: '#8a97a6',
  gold: '#ffe14a',
  red: '#ff4a4a',
  green: '#3ddc84',
  amber: '#ffb020',
};

const CAM_FOLLOW = 0.55; // how much the camera tracks the car sideways (rest shows as car movement)

interface Scene {
  road: Road;
  camZ: number;
  playerX: number;
  cars: readonly Car[];
  cond: Conditions;
  mountainOff: number;
  shake: number;
  braking: boolean;
  distance: number;
  showPlayer: boolean;
  time: number;
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demoRoad = new Road(7);
  private mountains: number[] = [];
  private stars: [number, number][] = [];

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    const r = new Rng(42);
    let h = 10;
    for (let i = 0; i < 160; i++) {
      h += r.range(-3, 3);
      if (h < 4) h = 4 + r.range(0, 3);
      if (h > 26) h = 26 - r.range(0, 3);
      this.mountains.push(Math.round(h));
    }
    // close the loop smoothly
    for (let i = 0; i < 8; i++) this.mountains[160 - 8 + i] = Math.round(this.mountains[160 - 8 + i] * (1 - i / 8) + this.mountains[0] * (i / 8));
    for (let i = 0; i < 48; i++) this.stars.push([r.int(0, W - 1), r.int(0, HORIZON - 22)]);
  }

  draw(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (g.state === 'menu' || g.state === 'howto' || g.state === 'ranking') {
      const t = g.time * 7000;
      this.drawScene({
        road: this.demoRoad,
        camZ: t,
        playerX: 0,
        cars: [],
        cond: conditionsAt((g.time / 75) % 1, 3),
        mountainOff: -this.demoRoad.curveAt(t) * g.time * 10,
        shake: 0,
        braking: false,
        distance: 0,
        showPlayer: false,
        time: g.time,
      });
      this.dim(0.58);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      this.drawHudFrame();
      this.drawHudHint(g);
      return;
    }

    this.drawScene({
      road: g.road,
      camZ: g.camZ,
      playerX: g.playerX,
      cars: g.traffic.cars,
      cond: g.cond,
      mountainOff: g.mountainOff,
      shake: g.shake,
      braking: g.braking,
      distance: g.distance,
      showPlayer: true,
      time: g.time,
    });
    this.drawHud(g);
    if (g.bannerT > 0 && g.state === 'playing') this.drawBanner(g);

    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- world ----------

  private drawScene(s: Scene): void {
    const ctx = this.ctx;
    const cond = s.cond;
    const shakeY = s.shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;

    // Sky with a graded band near the horizon
    ctx.fillStyle = css(cond.sky);
    ctx.fillRect(0, 0, W, HORIZON);
    const bands = 7;
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = css(lerpRgb(cond.sky, cond.skyLow, (i + 1) / bands).map(Math.round) as Rgb);
      ctx.fillRect(0, HORIZON - (bands - i) * 5, W, 5);
    }
    if (cond.dark > 0.6) {
      ctx.fillStyle = `rgba(255,255,255,${((cond.dark - 0.6) / 0.4) * 0.85})`;
      for (const [x, y] of this.stars) ctx.fillRect(x, y, 1, 1);
    }

    // Mountains (parallax with curves)
    const mcol = lerpRgb(cond.skyLow, [30, 30, 46], 0.6).map(Math.round) as Rgb;
    ctx.fillStyle = css(mcol);
    const off = Math.floor(s.mountainOff);
    for (let i = 0; i < 160; i++) {
      const h = this.mountains[(((i + off) % 160) + 160) % 160];
      ctx.fillRect(i * 2, HORIZON - h + shakeY, 2, h);
    }

    // Road
    const camX = s.playerX * CAM_FOLLOW;
    const road = s.road;
    road.ensure(s.camZ + (DRAW_SEGS + 2) * SEG_LEN);
    const baseIdx = road.indexAt(s.camZ);
    const basePct = (s.camZ - baseIdx * SEG_LEN) / SEG_LEN;
    let x = 0;
    let dx = -road.segments[baseIdx].curve * basePct;
    let maxy = PLAY_H;
    const xs: number[] = new Array(DRAW_SEGS + 2);
    const grassA = css(cond.grass);
    const grassB = css(cond.grass2);
    const roadCol = css(cond.road);
    const edgeCol = css(cond.edge);
    const fogCss = `${cond.fogColor[0]},${cond.fogColor[1]},${cond.fogColor[2]}`;

    for (let n = 0; n <= DRAW_SEGS; n++) {
      const seg = road.segments[baseIdx + n];
      xs[n] = x;
      let z1 = seg.index * SEG_LEN - s.camZ;
      const z2 = z1 + SEG_LEN;
      let x1 = x;
      const x2 = x + dx;
      x += dx;
      dx += seg.curve;
      if (z2 <= NEAR_Z) continue; // entirely below the bottom of the screen
      if (z1 < NEAR_Z) {
        const t = (NEAR_Z - z1) / SEG_LEN;
        x1 = x1 + (x2 - x1) * t;
        z1 = NEAR_Z;
      }
      const p1 = project(x1 - camX, z1);
      const p2 = project(x2 - camX, z2);
      const y1 = Math.min(PLAY_H, Math.round(p1.y)) + shakeY;
      const y2 = Math.round(p2.y) + shakeY;
      if (y2 >= y1 || y2 >= maxy) continue;
      maxy = y2;
      const rows = y1 - y2;

      ctx.fillStyle = (seg.index >> 2) & 1 ? grassA : grassB;
      ctx.fillRect(0, y2, W, rows);

      const w1 = screenWidth(ROAD_HALF, p1.scale);
      const w2 = screenWidth(ROAD_HALF, p2.scale);
      this.trapezoid(p1.x, y1, w1, p2.x, y2, w2, roadCol);
      const e1 = Math.max(1, w1 * 0.06);
      const e2 = Math.max(0.6, w2 * 0.06);
      this.trapezoid(p1.x - w1 + e1, y1, e1, p2.x - w2 + e2, y2, e2, edgeCol);
      this.trapezoid(p1.x + w1 - e1, y1, e1, p2.x + w2 - e2, y2, e2, edgeCol);

      const fog = fogAmount(n / DRAW_SEGS, cond.fogDensity);
      if (fog > 0.02) {
        ctx.fillStyle = `rgba(${fogCss},${fog.toFixed(3)})`;
        ctx.fillRect(0, y2, W, rows);
      }
    }
    xs[DRAW_SEGS + 1] = x;

    // Traffic, far to near
    const night = cond.dark > 0.55;
    const visible = [...s.cars]
      .filter((c) => c.z > s.camZ + 40 && c.z < s.camZ + DRAW_SEGS * SEG_LEN)
      .sort((a, b) => b.z - a.z);
    for (const c of visible) {
      const cz = c.z - s.camZ;
      const n = Math.floor(cz / SEG_LEN);
      const frac = cz / SEG_LEN - n;
      const roadX = xs[n] + (xs[n + 1] - xs[n]) * frac;
      const p = project(roadX + c.x - camX, Math.max(cz, 120));
      const fog = fogAmount(n / DRAW_SEGS, cond.fogDensity);
      if (fog > 0.93) continue;
      const spr = carSprite(c.color, night, Math.floor(c.z / 150) % 2);
      const w = screenWidth(CAR_W * 1.2, p.scale);
      const h = (w * spr.height) / spr.width;
      const y = Math.min(p.y, PLAY_H + h) + shakeY;
      if (y - h > PLAY_H) continue;
      ctx.globalAlpha = night ? 1 - fog * 0.6 : 1 - fog;
      ctx.drawImage(spr, Math.round(p.x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
    }
    ctx.globalAlpha = 1;

    // Player
    if (s.showPlayer) {
      const spr = playerSprite(s.braking, Math.floor(s.distance / 150) % 2);
      const p = project(s.playerX - camX, PLAYER_Z_OFF);
      const w = screenWidth(CAR_W * 1.2, p.scale);
      const h = (w * spr.height) / spr.width;
      ctx.drawImage(spr, Math.round(p.x - w / 2), Math.round(p.y - h) + shakeY, Math.round(w), Math.round(h));
    }

    // Night: darken everything beyond the headlights a touch more
    if (cond.dark > 0) {
      ctx.fillStyle = `rgba(0,0,10,${(cond.dark * 0.25).toFixed(3)})`;
      ctx.fillRect(0, 0, W, PLAY_H);
    }
  }

  private trapezoid(x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(Math.round(x1 - w1), y1);
    ctx.lineTo(Math.round(x1 + w1), y1);
    ctx.lineTo(Math.round(x2 + w2), y2);
    ctx.lineTo(Math.round(x2 - w2), y2);
    ctx.closePath();
    ctx.fill();
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
    drawTextCentered(ctx, 'SETAS/WASD DIRIGIR   ESPACO OU CIMA ACELERA   BAIXO FREIA', W / 2, PLAY_H + 8, C.dim, 1);
    drawTextCentered(ctx, 'P PAUSA   M SOM   C CRT   T TOQUE', W / 2, PLAY_H + 18, C.dim, 1);
    if (blink) drawTextCentered(ctx, 'ENTER OU ESPACO: SELECIONAR', W / 2, PLAY_H + 30, C.text, 1);
  }

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    this.drawHudFrame();
    const y0 = PLAY_H;

    // Day
    drawText(ctx, 'DIA', 10, y0 + 5, C.dim, 1);
    drawText(ctx, String(g.day).padStart(2, '0'), 10, y0 + 13, C.gold, 2);

    // Cars left / flags
    const cx = 96;
    drawText(ctx, 'CARROS', cx, y0 + 5, C.dim, 1);
    if (g.flags) {
      const f = sprite('flag');
      const bob = Math.floor(g.time * 4) % 2;
      ctx.drawImage(f, cx, y0 + 12 + bob);
      ctx.drawImage(f, cx + 12, y0 + 12 + (1 - bob));
      drawText(ctx, 'META OK', cx + 26, y0 + 15, C.green, 1);
    } else {
      ctx.drawImage(sprite('carIcon'), cx, y0 + 15);
      drawText(ctx, String(g.remaining).padStart(3, '0'), cx + 14, y0 + 13, C.text, 2);
    }

    // Odometer
    const kx = 176;
    drawText(ctx, 'KM', kx, y0 + 5, C.dim, 1);
    drawText(ctx, g.km.toFixed(1).padStart(6, '0'), kx, y0 + 13, C.text, 2);

    // Speed bar
    const sx = 244;
    drawText(ctx, 'VEL', sx, y0 + 5, C.dim, 1);
    const bw = 66;
    ctx.fillStyle = '#2a3340';
    ctx.fillRect(sx, y0 + 14, bw, 8);
    const pct = g.speedPct;
    ctx.fillStyle = g.onGrass ? C.amber : g.braking ? C.red : C.green;
    ctx.fillRect(sx + 1, y0 + 15, Math.round((bw - 2) * pct), 6);
    ctx.fillStyle = C.hudLine;
    ctx.fillRect(sx, y0 + 14, bw, 1);
    ctx.fillRect(sx, y0 + 21, bw, 1);

    // Day progress + phase
    const px = 10;
    const pw = W - 20;
    ctx.fillStyle = '#2a3340';
    ctx.fillRect(px, y0 + 32, pw, 3);
    ctx.fillStyle = C.dim;
    ctx.fillRect(px, y0 + 32, Math.round(pw * Math.min(1, g.dayTime / DAY_LEN)), 3);
    const phase: Record<string, string> = {
      dawn: 'AMANHECER', day: 'DIA', ice: 'GELO!', dusk: 'ENTARDECER', night: 'NOITE', fog: 'NEBLINA',
    };
    const label = phase[g.cond.phase];
    const col = g.cond.phase === 'ice' ? C.amber : C.dim;
    drawTextCentered(ctx, label, W / 2, y0 + 26, col, 1);
    const stripes = ['#e23d3d', '#ff9b2a', '#ffe14a', '#3ddc84', '#2f6fd8', '#9a4fd6'];
    stripes.forEach((s, i) => {
      ctx.fillStyle = s;
      ctx.fillRect(W - 10 - (stripes.length - i) * 4, y0 + 27, 3, 3);
    });
  }

  private drawBanner(g: Game): void {
    const ctx = this.ctx;
    const a = Math.min(1, g.bannerT / 0.5);
    ctx.globalAlpha = a;
    this.panel(W / 2 - 60, 70, 120, 32);
    drawTextCentered(ctx, g.bannerText, W / 2, 80, C.gold, 2);
    ctx.globalAlpha = 1;
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

    drawTextCentered(ctx, 'ENDURANCE', W / 2 + 2, 22 + 2, '#5a3a00', 3);
    drawTextCentered(ctx, 'ENDURANCE', W / 2, 22, C.gold, 3);
    drawTextCentered(ctx, 'EDICAO BROWSER', W / 2, 44, C.dim, 1);

    const pl = playerSprite(false);
    ctx.drawImage(pl, W / 2 - 32, 50 + bob, 64, 36);

    const startY = 92;
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

    drawTextCentered(ctx, 'HOMENAGEM AO CLASSICO ENDURO DA ATARI 2600', W / 2, 178, C.dim, 1);
    drawTextCentered(ctx, '2026', W / 2, 188, C.dim, 1);
  }

  private drawHowTo(): void {
    const ctx = this.ctx;
    this.panel(6, 6, W - 12, PLAY_H - 12);
    drawTextCentered(ctx, 'COMO JOGAR', W / 2, 14, C.gold, 2);
    const left = [
      'CORRIDA DE RESISTENCIA:',
      `ULTRAPASSE ${QUOTA_DAY1} CARROS NO DIA 1`,
      `E ${QUOTA_NEXT} EM CADA DIA SEGUINTE.`,
      '',
      'AO BATER A META APARECEM AS',
      'BANDEIRAS. SE O DIA ACABAR',
      'ANTES, O JOGO TERMINA.',
      '',
      'CARROS QUE TE ULTRAPASSAM',
      'SOMAM DE VOLTA NO CONTADOR.',
      '',
      'BATER EM UM CARRO DERRUBA',
      'SUA VELOCIDADE. SAIR DA PISTA',
      'TAMBEM FREIA O CARRO.',
    ];
    left.forEach((l, i) => drawText(ctx, l, 14, 34 + i * 8, C.text, 1));
    const right = [
      'O DIA MUDA:',
      '',
      'AMANHECER E DIA',
      'ENTARDECER',
      'NOITE: SO AS LANTERNAS',
      'NEBLINA: POUCA VISAO',
      'GELO: CARRO DESLIZA',
      '',
      'CURVAS EMPURRAM O',
      'CARRO PARA FORA.',
      '',
      'RANKING POR DIAS',
      'E KM RODADOS.',
    ];
    right.forEach((l, i) => drawText(ctx, l, 196, 34 + i * 8, i === 0 ? C.gold : C.dim, 1));
  }

  private drawRanking(g: Game, fromMenu: boolean): void {
    const ctx = this.ctx;
    this.panel(6, 6, W - 12, PLAY_H - 12);
    drawTextCentered(ctx, 'RANKING', W / 2, 14, C.gold, 2);
    if (g.highScores.length === 0) {
      drawTextCentered(ctx, 'SEM RECORDES AINDA', W / 2, 100, C.dim, 1);
    } else {
      drawText(ctx, 'POS  NOME   DIA      KM', 70, 34, C.dim, 1);
      g.highScores.forEach((h, i) => {
        const y = 46 + i * 13;
        const isNew = !fromMenu && h.initials === g.initials.join('') && h.day === g.day;
        const col = isNew ? C.gold : C.text;
        const line = `${String(i + 1).padStart(2, ' ')}.  ${h.initials.padEnd(3, ' ')}    ${String(h.day).padStart(2, '0')}   ${h.km.toFixed(1).padStart(6, ' ')}`;
        drawText(ctx, line, 70, y, col, 1);
      });
    }
    drawTextCentered(ctx, 'ENTER OU ESPACO: VOLTAR', W / 2, PLAY_H - 18, C.dim, 1);
  }

  private drawPaused(g: Game): void {
    const ctx = this.ctx;
    this.dim(0.6);
    this.panel(80, 60, W - 160, 84);
    drawTextCentered(ctx, 'PAUSA', W / 2, 70, C.gold, 2);
    PAUSE_ITEMS.forEach((item, i) => {
      const sel = i === g.pauseIndex;
      const y = 96 + i * 14;
      if (sel) drawText(ctx, '>', W / 2 - textWidth(item) / 2 - 10, y, C.gold, 1);
      drawTextCentered(ctx, item, W / 2, y, sel ? C.gold : C.text, 1);
    });
    drawTextCentered(ctx, 'P OU ESC: CONTINUAR', W / 2, 130, C.dim, 1);
  }

  private drawGameOver(g: Game): void {
    const ctx = this.ctx;
    this.dim(0.6);
    this.panel(60, 50, W - 120, 104);
    drawTextCentered(ctx, 'FIM DE JOGO', W / 2, 62, C.red, 2);
    drawTextCentered(ctx, g.gameOverReason, W / 2, 82, C.dim, 1);
    drawTextCentered(ctx, `CHEGOU AO DIA ${g.day}`, W / 2, 98, C.gold, 1);
    drawTextCentered(ctx, `${g.km.toFixed(1)} KM RODADOS`, W / 2, 108, C.text, 1);
    if (g.stateTime >= 1.5 && Math.floor(g.time * 2) % 2 === 0) {
      drawTextCentered(ctx, g.qualifiesForRank ? 'NOVO RECORDE! ENTER' : 'ENTER OU ESPACO: MENU', W / 2, 132, C.text, 1);
    }
  }

  private drawInitials(g: Game): void {
    const ctx = this.ctx;
    this.dim(0.6);
    this.panel(50, 30, W - 100, 140);
    drawTextCentered(ctx, 'NOVO RECORDE!', W / 2, 40, C.gold, 2);
    drawTextCentered(ctx, `DIA ${g.day}  ${g.km.toFixed(1)} KM`, W / 2, 58, C.text, 1);
    drawTextCentered(ctx, 'DIGITE SUAS INICIAIS', W / 2, 70, C.dim, 1);
    const scale = 3;
    const cw = 4 * scale;
    const x0 = W / 2 - (cw * 3 - scale) / 2;
    const y = 86;
    const blink = Math.floor(g.time * 3) % 2 === 0;
    g.initials.forEach((ch, i) => {
      const sel = i === g.initialsPos;
      drawText(ctx, ch, x0 + i * cw, y, sel ? C.gold : C.text, scale);
      if (sel && blink) {
        ctx.fillStyle = C.gold;
        ctx.fillRect(x0 + i * cw, y + 5 * scale + 2, 3 * scale, 2);
      }
    });
    drawTextCentered(ctx, 'CIMA/BAIXO: LETRA', W / 2, 122, C.dim, 1);
    drawTextCentered(ctx, 'ESQ/DIR: POSICAO', W / 2, 132, C.dim, 1);
    drawTextCentered(ctx, 'ENTER OU ESPACO: CONFIRMAR', W / 2, 148, C.text, 1);
  }
}
