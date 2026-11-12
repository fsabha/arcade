import { W, H, HUD_TOP, PLAY_BOTTOM, HUD_BOTTOM, MAX_LIVES, ROW_POINTS, UFO_POINTS } from './config';
import { Game, MENU_ITEMS, Explosion } from './game';
import { Formation } from './formation';
import { Barricade, makeBarricades } from './barricade';
import { sprite, spriteColor } from './sprites';
import {
  drawText, drawTextCentered, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen,
  drawInitialsScreen,
} from '@arcade/shared';

const C = {
  bg: '#05070c',
  ground: '#5cf06a',
  hud: '#0f1318',
  hudLine: '#3a4452',
  text: '#dfe6ee',
  dim: '#8a97a6',
  gold: '#ffe14a',
  red: '#ff4a4a',
  green: '#5cf06a',
  star: '#2a3340',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demo = new Formation(1, 24, 70);
  private demoTimer = 0;
  private demoLast = 0;
  private shieldCanvases = new WeakMap<Barricade, HTMLCanvasElement>();
  private stars: { x: number; y: number; b: number }[] = [];
  private demoShields: Barricade[] = [];

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    let s = 12345;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 60; i++) this.stars.push({ x: Math.floor(rnd() * W), y: HUD_TOP + Math.floor(rnd() * (PLAY_BOTTOM - HUD_TOP)), b: rnd() });
  }

  draw(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    this.drawStars(g.time);

    if (g.state === 'menu' || g.state === 'howto' || g.state === 'ranking') {
      this.drawDemo(g.time);
      this.dim(0.72);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g);
      this.drawBottomHint(g);
      return;
    }

    this.drawWorld(g);
    this.drawHud(g);

    if (g.state === 'paused') this.drawPaused(g);
    else if (g.phase === 'waveclear') this.drawWaveClear(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  private drawStars(time: number): void {
    const ctx = this.ctx;
    for (const s of this.stars) {
      const tw = (Math.sin(time * (1 + s.b * 2) + s.x) + 1) / 2;
      ctx.fillStyle = tw > 0.6 ? '#4a5668' : C.star;
      ctx.fillRect(s.x, s.y, 1, 1);
    }
  }

  // ---------- world ----------

  private drawFormation(f: Formation): void {
    const ctx = this.ctx;
    for (const inv of f.invaders) {
      if (!inv.alive) continue;
      const r = f.rect(inv);
      ctx.drawImage(sprite(`${inv.kind}${f.frame}`), r.x, r.y);
    }
  }

  private shieldCanvas(b: Barricade): HTMLCanvasElement {
    let c = this.shieldCanvases.get(b);
    if (!c) {
      c = document.createElement('canvas');
      c.width = b.w;
      c.height = b.h;
      this.shieldCanvases.set(b, c);
      b.dirty = true;
    }
    if (b.dirty) {
      const cx = c.getContext('2d')!;
      cx.clearRect(0, 0, b.w, b.h);
      cx.fillStyle = spriteColor('shield');
      for (let r = 0; r < b.h; r++) for (let col = 0; col < b.w; col++) if (b.get(col, r)) cx.fillRect(col, r, 1, 1);
      b.dirty = false;
    }
    return c;
  }

  private drawWorld(g: Game): void {
    const ctx = this.ctx;
    this.drawFormation(g.formation);
    for (const b of g.barricades) ctx.drawImage(this.shieldCanvas(b), b.x, b.y);

    if (g.ufo) ctx.drawImage(sprite('ufo'), Math.round(g.ufo.x), g.ufo.y);

    if (g.bullet) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(g.bullet.x), Math.round(g.bullet.y), g.bullet.w, g.bullet.h);
    }
    for (const s of g.shots) ctx.drawImage(sprite(`shot${s.frame}`), Math.round(s.x), Math.round(s.y));

    const showPlayer = g.phase !== 'dying' && g.state !== 'gameover' && g.state !== 'initials';
    if (showPlayer && (g.grace === 0 || Math.floor(g.time * 10) % 2 === 0)) {
      ctx.drawImage(sprite('player'), Math.round(g.player.x), g.player.y);
    }

    for (const ex of g.explosions) this.drawExplosion(ex, g.time);

    // ground line
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, PLAY_BOTTOM - 1, W, 1);
  }

  private drawExplosion(ex: Explosion, time: number): void {
    const ctx = this.ctx;
    if (ex.kind === 'invader') {
      ctx.drawImage(sprite('explosion'), Math.round(ex.x), Math.round(ex.y));
    } else if (ex.kind === 'ufo') {
      if (ex.t < 0.35) ctx.drawImage(sprite('ufoBoom', '#ff4a4a'), Math.round(ex.x), Math.round(ex.y));
      else if (ex.label) drawTextCentered(ctx, ex.label, Math.round(ex.x) + 8, Math.round(ex.y) + 1, C.red, 1);
    } else {
      const f = Math.floor(time * 10) % 2;
      ctx.drawImage(sprite(`playerBoom${f}`, '#5cf06a'), Math.round(ex.x), Math.round(ex.y));
    }
  }

  private drawDemo(time: number): void {
    if (this.demoLast === 0) this.demoLast = time;
    this.demoTimer += time - this.demoLast;
    this.demoLast = time;
    const interval = 0.5;
    while (this.demoTimer >= interval) {
      this.demoTimer -= interval;
      this.demo.step();
      const b = this.demo.bounds();
      if (b && b.bottom > 200) this.demo = new Formation(1, 24, 70);
    }
    this.drawFormation(this.demo);
    if (this.demoShields.length === 0) this.demoShields = makeBarricades();
    for (const b of this.demoShields) this.ctx.drawImage(this.shieldCanvas(b), b.x, b.y);
    this.ctx.drawImage(sprite('player'), W / 2 - 6, 284);
    this.ctx.fillStyle = C.ground;
    this.ctx.fillRect(0, PLAY_BOTTOM - 1, W, 1);
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.hud;
    ctx.fillRect(0, 0, W, HUD_TOP);
    ctx.fillStyle = C.hudLine;
    ctx.fillRect(0, HUD_TOP - 1, W, 1);
    drawText(ctx, 'PONTOS', 6, 3, C.dim, 1);
    drawText(ctx, String(g.score.score).padStart(6, '0'), 34, 3, C.gold, 1);
    drawText(ctx, 'RECORDE', 104, 3, C.dim, 1);
    drawText(ctx, String(g.hiScore).padStart(6, '0'), 136, 3, C.text, 1);
    drawText(ctx, 'ONDA', 174, 3, C.dim, 1);
    drawText(ctx, String(g.wave).padStart(2, '0'), 194, 3, C.text, 1);

    ctx.fillStyle = C.hud;
    ctx.fillRect(0, PLAY_BOTTOM, W, HUD_BOTTOM);
    const livesShown = Math.min(MAX_LIVES, Math.max(0, g.score.lives - 1));
    drawText(ctx, String(g.score.lives), 6, PLAY_BOTTOM + 6, C.text, 1);
    for (let i = 0; i < livesShown; i++) ctx.drawImage(sprite('player'), 14 + i * 16, PLAY_BOTTOM + 5);
    drawTextCentered(ctx, 'ESPACO ATIRAR   P PAUSA', 170, PLAY_BOTTOM + 7, C.dim, 1);
  }

  private drawBottomHint(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.hud;
    ctx.fillRect(0, PLAY_BOTTOM, W, HUD_BOTTOM);
    ctx.fillStyle = C.hudLine;
    ctx.fillRect(0, PLAY_BOTTOM, W, 1);
    const blink = Math.floor(g.time * 2) % 2 === 0;
    drawTextCentered(ctx, 'SETAS/AD MOVER   ESPACO ATIRAR   P PAUSA', W / 2, PLAY_BOTTOM + 4, C.dim, 1);
    if (blink) drawTextCentered(ctx, 'ENTER OU FOGO: SELECIONAR', W / 2, PLAY_BOTTOM + 12, C.text, 1);
  }

  // ---------- overlays ----------

  private dim(alpha: number): void {
    this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    this.ctx.fillRect(0, 0, W, PLAY_BOTTOM);
  }

  private drawMenu(g: Game): void {
    const ctx = this.ctx;
    drawMenuScreen(ctx, W, PLAY_BOTTOM, {
      title: 'SPACE INVADERS', titleColor: C.green, titleScale: 2, titleY: 30, subtitle: 'EDICAO BROWSER',
      labels: MENU_ITEMS.map((item) => g.shell.label(item)),
      selected: g.menuIndex, time: g.time, itemsY: 150, itemGap: 14,
      footer: ['HOMENAGEM AO CLASSICO DE 1978'], footerY: 232,
    });
    // point table
    const rows: [string, string][] = [['squid0', `= ${ROW_POINTS[0]} PONTOS`], ['crab0', `= ${ROW_POINTS[1]} PONTOS`], ['octopus0', `= ${ROW_POINTS[3]} PONTOS`], ['ufo', '= ? MISTERIO']];
    rows.forEach(([sp, label], i) => {
      const y = 80 + i * 14;
      const s = sprite(sp);
      ctx.drawImage(s, 78 - s.width / 2, y);
      drawText(ctx, label, 92, y + 1, C.text, 1);
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, PLAY_BOTTOM, [
      'DEFENDA A TERRA DOS INVASORES.',
      'MOVA O CANHAO E ATIRE. SO HA',
      'UM TIRO SEU NA TELA POR VEZ.',
      '',
      'OS INVASORES ACELERAM CONFORME',
      'SAO DESTRUIDOS. SE CHEGAREM AO',
      'CHAO, A INVASAO VENCE.',
      '',
      'AS BARRICADAS PROTEGEM, MAS SE',
      'DESGASTAM COM OS TIROS.',
      '',
      `NAVE MISTERIOSA: ${UFO_POINTS[0]} A ${UFO_POINTS[3]} PONTOS.`,
      '3 VIDAS. VIDA EXTRA EM 1500.',
      'CADA ONDA COMECA MAIS BAIXA.',
    ], { gap: 11 });
  }

  private drawRanking(g: Game): void {
    drawRankingScreen(this.ctx, W, PLAY_BOTTOM, [], true, { shell: g.shell });
  }

  private drawPaused(g: Game): void {
    drawPausedScreen(this.ctx, W, PLAY_BOTTOM, g.pauseIndex);
  }

  private drawWaveClear(g: Game): void {
    const ctx = this.ctx;
    if (Math.floor(g.time * 3) % 2 === 0) {
      drawTextCentered(ctx, `ONDA ${g.wave} LIMPA!`, W / 2, 150, C.gold, 2);
    }
    drawTextCentered(ctx, 'PREPARE-SE...', W / 2, 170, C.text, 1);
  }

  private drawGameOver(g: Game): void {
    drawGameOverScreen(this.ctx, W, PLAY_BOTTOM, {
      title: 'GAME OVER',
      lines: [`PONTOS ${String(g.score.score).padStart(6, '0')}`, `ONDA ${g.wave}`, g.deathReason],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }

  private drawInitials(g: Game): void {
    drawInitialsScreen(this.ctx, W, PLAY_BOTTOM, `PONTOS ${String(g.score.score).padStart(6, '0')}`, g.initials, g.initialsPos, g.time);
  }
}
