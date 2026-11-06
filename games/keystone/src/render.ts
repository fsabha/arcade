import {
  W, H, HUD_H, WORLD_W, SCREENS, FEET, ROOF, SLAB_H, SCANNER_Y, KELLY_H, HARRY_H, ESC_W, ELEV_X, ELEV_W, TIMER_WARN,
  TIMER_START, HIT_PENALTY, BONUS_KOP_EVERY, LOOT_POINTS,
} from './config';
import { Game, MENU_ITEMS } from './game';
import { escalatorRange, obstacleRect, lootRect, Store } from './store';
import { sprite } from './sprites';
import {
  drawText, textWidth, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen,
  drawInitialsScreen,
} from '@arcade/shared';

const C = {
  sky: '#101828', skyline: '#283048', roof: '#606878',
  floor: ['#a8d8a0', '#b8d0e8', '#e8d8a0'],
  slab: '#c89860', slabLine: '#805020', wall: '#d0b890',
  esc: '#b08050', escStep: '#704020', escRail: '#303030',
  shaft: '#e05030', shaftDark: '#a03020', door: '#f0c060', car: '#9098a0', carDark: '#606870',
  scanner: '#303030', scanLine: '#80c080', text: '#dfe6ee', dim: '#8a97a6', gold: '#ffe14a', red: '#ff4a4a',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demo = new Store(1, 5);

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
      this.demo.elevator.update(1 / 60);
      this.drawStore(this.demo, 0, g.time);
      ctx.drawImage(sprite('stand'), 48, FEET[0] - KELLY_H);
      ctx.drawImage(sprite(`harry${Math.floor(g.time * 8) % 2}`), 200, FEET[0] - HARRY_H);
      ctx.fillStyle = 'rgba(0,0,0,0.66)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    const screen = g.screen;
    this.drawStore(g.store, screen, g.time);
    this.drawActors(g, screen);
    this.drawScanner(g);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- the store ----------

  private drawStore(store: Store, screen: number, time: number): void {
    const ctx = this.ctx;
    const ox = screen * W; // world x of the left edge of the view

    // sky and skyline above the roof
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, HUD_H, W, FEET[ROOF] - HUD_H);
    ctx.fillStyle = C.skyline;
    for (let i = 0; i < 12; i++) {
      const bx = ((i * 53 + 7) % (W + 40)) - 20;
      const bh = 8 + ((i * 37) % 14);
      ctx.fillRect(bx, FEET[ROOF] - bh, 18, bh);
    }
    ctx.fillStyle = C.roof;
    ctx.fillRect(0, FEET[ROOF], W, SLAB_H);

    // floors, bottom to top
    for (let f = 0; f < ROOF; f++) {
      const top = FEET[f + 1] + SLAB_H;
      ctx.fillStyle = C.floor[f];
      ctx.fillRect(0, top, W, FEET[f] - top);
      ctx.fillStyle = C.slab;
      ctx.fillRect(0, FEET[f], W, SLAB_H);
      ctx.fillStyle = C.slabLine;
      ctx.fillRect(0, FEET[f] + SLAB_H - 1, W, 1);
      // counters along the back wall
      ctx.fillStyle = C.wall;
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 97 + f * 31 + 20) % (W - 40)) + 10;
        ctx.fillRect(cx, FEET[f] - 12, 24, 6);
      }
      this.drawEscalator(f, ox, time);
    }
    this.drawElevator(store, ox);
  }

  private drawEscalator(floor: number, ox: number, time: number): void {
    const ctx = this.ctx;
    const esc = escalatorRange(floor);
    const left = Math.min(esc.x0, esc.x1) - ox;
    if (left + ESC_W < 0 || left > W) return;
    const y0 = FEET[floor];
    const y1 = FEET[floor + 1];
    const steps = 12;
    const scroll = Math.floor(time * 6) % 2;
    for (let i = 0; i < steps; i++) {
      const k = i / steps;
      const x = esc.x0 + (esc.x1 - esc.x0) * k - ox;
      const y = y0 + (y1 - y0) * k;
      const w = ESC_W / steps;
      ctx.fillStyle = (i + scroll) % 2 ? C.esc : C.escStep;
      ctx.fillRect(Math.round(esc.side > 0 ? x : x - w), Math.round(y), Math.ceil(w), Math.round(y0 - y) + SLAB_H);
    }
    ctx.fillStyle = C.escRail;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const x = esc.x0 + (esc.x1 - esc.x0) * k - ox;
      const y = y0 + (y1 - y0) * k;
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 14, 2, 2);
    }
  }

  private drawElevator(store: Store, ox: number): void {
    const ctx = this.ctx;
    const x = ELEV_X - ELEV_W / 2 - ox;
    if (x + ELEV_W < 0 || x > W) return;
    const top = FEET[ROOF] + SLAB_H;
    // art-deco shaft on every floor
    for (let f = 0; f < ROOF; f++) {
      const t = FEET[f + 1] + SLAB_H;
      ctx.fillStyle = C.shaft;
      ctx.fillRect(x - 6, t, ELEV_W + 12, FEET[f] - t);
      ctx.fillStyle = C.shaftDark;
      ctx.fillRect(x - 6, t, 3, FEET[f] - t);
      ctx.fillRect(x + ELEV_W + 3, t, 3, FEET[f] - t);
      ctx.fillStyle = C.door;
      ctx.fillRect(x, t + 6, ELEV_W, FEET[f] - t - 6);
      ctx.fillStyle = C.shaftDark;
      ctx.fillRect(x + ELEV_W / 2 - 1, t + 6, 2, FEET[f] - t - 6);
    }
    // the car
    const e = store.elevator;
    const feet = e.feet;
    const h = FEET[0] - FEET[1] - SLAB_H - 6;
    ctx.fillStyle = e.open ? C.carDark : C.car;
    ctx.fillRect(x, feet - h, ELEV_W, h);
    if (!e.open) {
      ctx.fillStyle = C.shaftDark;
      ctx.fillRect(x + ELEV_W / 2 - 1, feet - h, 2, h);
    }
    void top;
  }

  // ---------- actors ----------

  private drawActors(g: Game, screen: number): void {
    const ctx = this.ctx;
    const ox = screen * W;
    const st = g.store;
    for (const l of st.loot) {
      if (l.taken) continue;
      const r = lootRect(l);
      if (r.x + r.w < ox || r.x > ox + W) continue;
      ctx.drawImage(sprite(l.kind), Math.round(r.x - ox), Math.round(r.y));
    }
    for (const o of st.obstacles) {
      const r = obstacleRect(o);
      if (r.x + r.w < ox || r.x > ox + W) continue;
      const name = o.kind;
      const s = sprite(name, o.dir > 0 && o.kind !== 'radio');
      ctx.drawImage(s, Math.round(r.x - ox), Math.round(r.y + r.h - s.height));
    }
    // Harry
    const h = g.harry;
    if (!h.escaped && h.x + 16 > ox && h.x < ox + W) {
      const name = `harry${Math.floor(h.phase) % 2}`;
      ctx.drawImage(sprite(name, h.facing < 0), Math.round(h.x - ox), Math.round(h.feet) - HARRY_H);
    }
    this.drawKelly(g, ox);
  }

  private drawKelly(g: Game, ox: number): void {
    const ctx = this.ctx;
    const k = g.kelly;
    if (k.mode === 'lost' && Math.floor(k.t * 8) % 2 === 1) return;
    if (k.mode === 'elevator' && !g.store.elevator.open) return;
    let name = 'stand';
    switch (k.mode) {
      case 'run':
        if (k.jumpT >= 0) name = 'jump';
        else if (k.ducking) name = 'duck';
        else name = k.walking ? `run${Math.floor(k.phase) % 2}` : 'stand';
        break;
      case 'escalator': name = 'stand'; break;
      case 'elevator': name = 'stand'; break;
      case 'ko': name = 'ko'; break;
      case 'caught': name = Math.floor(k.t * 6) % 2 ? 'jump' : 'stand'; break;
      case 'lost': name = g.lossReason === 'plane' ? 'ko' : 'stand'; break;
    }
    const s = sprite(name, k.facing < 0);
    ctx.drawImage(s, Math.round(k.x - ox), Math.round(k.feet - g.lift) - s.height);
  }

  // ---------- Southwick's Security System ----------

  private drawScanner(g: Game): void {
    const ctx = this.ctx;
    const x0 = 40;
    const sw = 240;
    ctx.fillStyle = C.scanner;
    ctx.fillRect(x0 - 6, SCANNER_Y, sw + 12, 32);
    const rowY = (floor: number) => SCANNER_Y + 26 - floor * 7;
    const sx = (wx: number) => x0 + (wx / WORLD_W) * sw;
    for (let f = 0; f <= ROOF; f++) {
      ctx.fillStyle = C.scanLine;
      ctx.fillRect(x0, rowY(f), sw, 1);
      if (f < ROOF) {
        const esc = escalatorRange(f);
        ctx.fillStyle = '#000';
        for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(sx(Math.min(esc.x0, esc.x1)) + i * 2), rowY(f) - 1 - i, 1, 2);
      }
    }
    // elevator
    const e = g.store.elevator;
    const ey = rowY(e.floor) + (rowY(e.target) - rowY(e.floor)) * e.progress;
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(Math.round(sx(ELEV_X)) - 2, Math.round(ey) - 3, 4, 4);
    // Harry (white) and Kelly (black)
    if (!g.harry.escaped) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(sx(g.harry.x + 8)) - 1, Math.round(rowY(g.harry.floor) + (g.harry.ride >= 0 ? -g.harry.ride * 7 : 0)) - 2, 3, 3);
    }
    ctx.fillStyle = '#000000';
    const ky = g.kelly.mode === 'elevator' ? ey : rowY(g.kelly.floor) + (g.kelly.ride >= 0 ? -g.kelly.ride * 7 : 0);
    ctx.fillRect(Math.round(sx(g.kelly.x + 8)) - 1, Math.round(ky) - 2, 3, 3);
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, HUD_H);
    drawText(ctx, String(g.score).padStart(6, '0'), 8, 4, C.text, 2);
    const t = Math.ceil(g.timer);
    const warn = t <= TIMER_WARN && Math.floor(g.time * 4) % 2 === 0;
    drawText(ctx, String(t).padStart(2, '0'), 8 + textWidth('000000', 2) + 12, 4, warn ? C.red : C.gold, 2);
    drawText(ctx, `KROOK ${g.krook}`, 150, 16, C.dim);
    for (let i = 0; i < g.reserve; i++) ctx.drawImage(sprite('kop'), W - 14 - i * 11, 4);
  }

  // ---------- screens (shared look, game-specific words) ----------

  private drawMenu(g: Game): void {
    drawMenuScreen(this.ctx, W, H, {
      title: 'KEYSTONE KAPERS', titleColor: '#f0c060', subtitle: 'PRENDA HARRY HOOLIGAN ANTES DO TEMPO ACABAR',
      labels: MENU_ITEMS.map((item) => g.shell.label(item)),
      selected: g.menuIndex, time: g.time, itemsY: 86,
      footer: ['SETAS CORREM  ESPACO PULA  BAIXO ABAIXA', 'CIMA ENTRA NO ELEVADOR  BAIXO SAI', 'ACTIVISION 1983  EDICAO BROWSER'], footerY: 178,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'HARRY HOOLIGAN FOGE PELA LOJA SOUTHWICK',
      'SOBE AS ESCADAS ROLANTES ATE O TELHADO E ESCAPA',
      'KELLY PRECISA ALCANCA-LO ANTES DO TEMPO ACABAR',
      `TEMPO: ${TIMER_START} SEGUNDOS  PISCA NOS ULTIMOS ${TIMER_WARN}`,
      `CARRINHO BOLA E RADIO: PULE  COLIDIR CUSTA ${HIT_PENALTY} S`,
      'BOLAS ALTAS E BIPLANOS: ABAIXE  BIPLANO TIRA UM KOP',
      `MALAS E SACOS DE DINHEIRO VALEM ${LOOT_POINTS}`,
      'KROOK VALE TEMPO X 100 (9 A 16: X 200  17+: X 300)',
      'ELEVADOR VAI ATE O 3 ANDAR  SO ESCADA CHEGA AO TELHADO',
      'DO TELHADO NAO SE DESCE: SUBA SO ATRAS DO HARRY',
      `KOP EXTRA A CADA ${BONUS_KOP_EVERY} PONTOS (MAX 3)`,
    ]);
  }

  private drawRanking(g: Game, menu: boolean): void {
    const rows = g.highScores.map((h, i) => `${String(i + 1).padStart(2, ' ')}  ${h.initials.padEnd(3, ' ')}  ${String(h.score).padStart(6, ' ')}  ${String(h.krooks).padStart(2, ' ')} KROOKS`);
    drawRankingScreen(this.ctx, W, H, rows, menu, { shell: g.shell });
  }

  private drawPaused(g: Game): void {
    drawPausedScreen(this.ctx, W, H, g.pauseIndex);
  }

  private drawGameOver(g: Game): void {
    const why = g.lossReason === 'plane' ? 'BIPLANO' : g.lossReason === 'escape' ? 'HARRY FUGIU PELO TELHADO' : 'TEMPO ESGOTADO';
    drawGameOverScreen(this.ctx, W, H, {
      lines: [`PONTOS ${g.score}`, `KROOKS PRESOS ${g.krooksCaught}`, why],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }

  private drawInitials(g: Game): void {
    drawInitialsScreen(this.ctx, W, H, `${g.score} PONTOS`, g.initials, g.initialsPos, g.time);
  }
}

export { SCREENS };
