import { W, H, TILE, COLS, ROWS, VIEW_H, HUD_Y, HERO_W, HERO_H, LASER_RANGE, POWER_MAX, BLAST_RADIUS, BLAST_SHOW, FUSE_TIME, LAST_LEVEL } from './config';
import { Game, MENU_ITEMS } from './game';
import { World } from './world';
import { sprite } from './sprites';
import {
  drawText, textWidth, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen,
  drawInitialsScreen,
} from '@arcade/shared';

const C = {
  rock: '#6c4a2c', rockLight: '#8a6038', rockDark: '#4a3018',
  wall: '#a89070', wallLine: '#786048',
  magma: '#d03020', magmaHot: '#ff8040',
  lava: '#e04010', lavaHot: '#ffa030',
  raft: '#8a6a40', raftLine: '#5a4020',
  air: '#000000',
  text: '#dfe6ee', dim: '#8a97a6', gold: '#ffe14a', red: '#ff4a4a', green: '#3ddc84',
  laser: '#ff4040', laserCore: '#ffffff',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demo = new World(1);

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
      this.drawWorld(this.demo, 0, 0, g.time, false);
      ctx.fillStyle = 'rgba(0,0,0,0.66)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    const { sx, sy } = g.screen;
    this.drawWorld(g.world, sx, sy, g.time, g.isDark, g);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- world ----------

  private drawWorld(w: World, sx: number, sy: number, time: number, dark: boolean, g?: Game): void {
    const ctx = this.ctx;
    const ox = sx * COLS * TILE;
    const oy = sy * ROWS * TILE;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, VIEW_H);
    ctx.clip();

    if (!dark) {
      for (let ty = 0; ty < ROWS; ty++) {
        for (let tx = 0; tx < COLS; tx++) {
          const c = w.tile(sx * COLS + tx, sy * ROWS + ty);
          const x = tx * TILE;
          const y = ty * TILE;
          switch (c) {
            case '#':
              ctx.fillStyle = C.rock; ctx.fillRect(x, y, TILE, TILE);
              ctx.fillStyle = C.rockLight; ctx.fillRect(x, y, TILE, 2); ctx.fillRect(x + ((tx * 7 + ty * 3) % 10), y + 6, 4, 2);
              ctx.fillStyle = C.rockDark; ctx.fillRect(x, y + TILE - 2, TILE, 2); ctx.fillRect(x + ((tx * 5 + ty * 11) % 12), y + 10, 3, 2);
              break;
            case 'D': {
              ctx.fillStyle = C.wall; ctx.fillRect(x, y, TILE, TILE);
              ctx.fillStyle = C.wallLine;
              ctx.fillRect(x, y + 7, TILE, 1); ctx.fillRect(x, y + 15, TILE, 1);
              ctx.fillRect(x + 7, y, 1, 7); ctx.fillRect(x + 3, y + 8, 1, 7); ctx.fillRect(x + 11, y + 8, 1, 7);
              const burn = w.burn.get(`${sx * COLS + tx},${sy * ROWS + ty}`);
              if (burn) { ctx.fillStyle = C.laser; ctx.fillRect(x + 2, y + 2, Math.min(12, burn * 8), 12); }
              break;
            }
            case 'M': {
              const hot = Math.floor(time * 6 + tx + ty) % 2 === 0;
              ctx.fillStyle = hot ? C.magma : C.rock; ctx.fillRect(x, y, TILE, TILE);
              ctx.fillStyle = C.magmaHot; ctx.fillRect(x + 2, y + 3 + ((tx + ty) % 4), 5, 2); ctx.fillRect(x + 9, y + 9 + ((tx * 3) % 3), 4, 2);
              break;
            }
            case 'L': {
              ctx.fillStyle = C.lava; ctx.fillRect(x, y, TILE, TILE);
              ctx.fillStyle = C.lavaHot;
              const k = Math.floor(time * 5 + tx) % 4;
              ctx.fillRect(x + k * 4, y + 2, 4, 2);
              ctx.fillRect(x + ((k + 2) % 4) * 4, y + 9, 4, 2);
              break;
            }
          }
        }
      }
      for (const r of w.rafts) {
        ctx.fillStyle = C.raft; ctx.fillRect(Math.round(r.x - ox), r.y - oy - 2, r.w, 6);
        ctx.fillStyle = C.raftLine; ctx.fillRect(Math.round(r.x - ox), r.y - oy + 3, r.w, 1);
      }
      for (const l of w.lanterns) ctx.drawImage(sprite(l.lit ? 'lantern0' : 'lantern1'), l.x - ox + 2, l.y - oy + 2);
      ctx.drawImage(sprite('miner'), w.miner.x - ox, w.miner.y - oy + 8);
    } else {
      // dark section: only a hint of the miner's lamp
      ctx.fillStyle = '#101010';
      ctx.fillRect(0, 0, W, VIEW_H);
    }

    // creatures show even in the dark, dimly
    if (dark) ctx.globalAlpha = 0.45;
    for (const c of w.critters) {
      if (!c.alive) continue;
      const name = c.kind;
      const s = sprite(name, c.dir < 0);
      if (c.kind === 'spider' && !dark) { ctx.fillStyle = '#c0c0c0'; ctx.fillRect(c.x + 6 - ox, c.baseY - oy, 1, c.y - c.baseY); }
      ctx.drawImage(s, Math.round(c.x - ox), Math.round(c.y - oy));
    }
    for (const t of w.tentacles) ctx.drawImage(sprite(`tentacle${Math.floor(time * 4) % 2}`), Math.round(t.x - ox), t.y - oy - 10);
    ctx.globalAlpha = 1;

    if (g) this.drawHero(g, ox, oy, dark);
    ctx.restore();
  }

  private drawHero(g: Game, ox: number, oy: number, dark: boolean): void {
    const ctx = this.ctx;
    const h = g.hero;
    const hx = Math.round(h.x - ox);
    const hy = Math.round(h.y - oy);
    // dynamite lights the dark until it blows
    if (g.dynamite) {
      const d = g.dynamite;
      if (dark) {
        const r = 40 + 20 * (1 - d.fuse / FUSE_TIME);
        ctx.fillStyle = 'rgba(255,200,120,0.18)';
        ctx.fillRect(d.x - ox - r, d.y - oy - r, r * 2, r * 2);
      }
      ctx.drawImage(sprite('stick'), Math.round(d.x - ox) - 2, Math.round(d.y - oy));
      if (Math.floor(g.time * 12) % 2 === 0) { ctx.fillStyle = '#fff080'; ctx.fillRect(Math.round(d.x - ox), Math.round(d.y - oy) - 2, 2, 2); }
    }
    if (g.blast) {
      const k = g.blast.t / BLAST_SHOW;
      const r = BLAST_RADIUS * (0.4 + 0.6 * k);
      ctx.fillStyle = k < 0.5 ? '#fff0a0' : '#ff8030';
      ctx.fillRect(Math.round(g.blast.x - ox - r), Math.round(g.blast.y - oy - r), r * 2, r * 2);
      ctx.fillStyle = '#000';
      ctx.fillRect(Math.round(g.blast.x - ox - r * 0.4), Math.round(g.blast.y - oy - r * 0.4), r * 0.8, r * 0.8);
    }
    let name = h.flying || !h.grounded ? `hero${Math.floor(h.phase) % 2}` : h.walking ? `run${Math.floor(h.phase) % 2}` : 'hero0';
    if (h.mode === 'dead') name = Math.floor(h.t * 8) % 2 ? 'dead' : 'hero1';
    if (h.mode === 'rescue' && Math.floor(h.t * 6) % 2) name = 'hero1';
    ctx.drawImage(sprite(name, h.facing < 0), hx, hy);
    if (g.laser && h.mode === 'alive') {
      const y = hy + 6;
      const x0 = h.facing > 0 ? hx + HERO_W : hx;
      const len = g.laserHit ? Math.abs(g.laserHit.x - (h.facing > 0 ? h.x + HERO_W : h.x)) : LASER_RANGE;
      const x = h.facing > 0 ? x0 : x0 - len;
      ctx.fillStyle = C.laser; ctx.fillRect(Math.round(x), y, Math.round(len), 2);
      ctx.fillStyle = C.laserCore; ctx.fillRect(Math.round(x), y, Math.round(len), 1);
    }
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, HUD_Y, W, H - HUD_Y);
    ctx.fillStyle = '#303848';
    ctx.fillRect(0, HUD_Y, W, 1);
    // score or level number at the start of a level
    if (g.levelIntro > 0 && g.levelLabel) {
      const lbl = g.level > LAST_LEVEL ? 'PRO' : `NIVEL ${g.levelLabel}`;
      drawText(ctx, lbl, 8, HUD_Y + 6, C.gold, 2);
    } else {
      drawText(ctx, String(g.score).padStart(6, '0'), 8, HUD_Y + 6, C.text, 2);
    }
    // power bar
    const barW = 180;
    const k = g.power / POWER_MAX;
    ctx.fillStyle = '#202830';
    ctx.fillRect(8, HUD_Y + 24, barW, 8);
    ctx.fillStyle = k > 0.5 ? C.green : k > 0.2 ? C.gold : C.red;
    ctx.fillRect(8, HUD_Y + 24, Math.round(barW * k), 8);
    drawText(ctx, 'ENERGIA', 8, HUD_Y + 36, C.dim);
    // lives
    for (let i = 0; i < g.reserve; i++) ctx.drawImage(sprite('hero1'), W - 20 - i * 16, HUD_Y + 4);
    // dynamite
    for (let i = 0; i < g.sticks; i++) { ctx.fillStyle = '#e04040'; ctx.fillRect(W - 18 - i * 8, HUD_Y + 28, 4, 8); ctx.fillStyle = '#fff080'; ctx.fillRect(W - 18 - i * 8 + 1, HUD_Y + 26, 2, 2); }
    drawText(ctx, 'DINAMITE', W - 8 - textWidth('DINAMITE'), HUD_Y + 38, C.dim);
    if (g.levelLabel) drawText(ctx, `N${g.levelLabel}`, 200, HUD_Y + 6, C.dim);
  }

  // ---------- screens (shared look, game-specific words) ----------

  private drawMenu(g: Game): void {
    drawMenuScreen(this.ctx, W, H, {
      title: 'H.E.R.O.', titleColor: '#f0c040', subtitle: 'HELICOPTER EMERGENCY RESCUE OPERATION',
      labels: MENU_ITEMS.map((item) => (item === 'JOGO'
        ? `JOGO ${g.gameNumber}: ${g.gameNumber === 5 ? 'NIVEIS ALEATORIOS' : `COMECA NO NIVEL ${[1, 5, 9, 13, 17][g.gameNumber - 1]}`}`
        : g.shell.label(item))),
      selected: g.menuIndex, time: g.time, itemsY: 86,
      footer: ['CIMA VOA  ESPACO LASER  BAIXO DINAMITE', 'ACTIVISION 1984  EDICAO BROWSER'], footerY: 190,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'RESGATE O MINEIRO NO FUNDO DE CADA MINA',
      'CIMA LIGA A HELICE; SOLTE PARA DESCER',
      'ESPACO: LASER (50 POR BICHO, CORTA PAREDE DEVAGAR)',
      'BAIXO NO CHAO: DINAMITE (6 POR VIDA, 75 POR PAREDE)',
      'A EXPLOSAO TAMBEM MATA VOCE: AFASTE-SE',
      'LANTERNA TOCADA OU ATINGIDA APAGA A TELA',
      'MAGMA VERMELHO, LAVA, TENTACULO E BICHOS MATAM',
      'ENERGIA ACABOU = VIDA PERDIDA',
      'MINEIRO: 1000 + 50 POR DINAMITE + BONUS DE ENERGIA',
      'VIDA EXTRA A CADA 20000 PONTOS',
    ]);
  }

  private drawRanking(g: Game, menu: boolean): void {
    const rows = g.highScores.map((h, i) => `${String(i + 1).padStart(2, ' ')}  ${h.initials.padEnd(3, ' ')}  ${String(h.score).padStart(7, ' ')}  NIVEL ${String(h.level).padStart(2, ' ')}  ${h.mode.padEnd(6, ' ')}`);
    drawRankingScreen(this.ctx, W, H, rows, menu);
  }

  private drawPaused(g: Game): void {
    drawPausedScreen(this.ctx, W, H, g.pauseIndex);
  }

  private drawGameOver(g: Game): void {
    drawGameOverScreen(this.ctx, W, H, {
      lines: [`PONTOS ${g.score}`, `MINEIROS RESGATADOS ${g.minersRescued}`, `NIVEL ${g.levelLabel || '?'}  ${g.modeLabel}`],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }

  private drawInitials(g: Game): void {
    drawInitialsScreen(this.ctx, W, H, `${g.score} PONTOS`, g.initials, g.initialsPos, g.time);
  }
}

export { HERO_H };
