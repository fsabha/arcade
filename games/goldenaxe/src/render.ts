import { W, H, HUD_H, FLOOR_TOP, BAR, MAX_POTS, MAGIC_NAMES, HERO_IDS, HERO_NAMES, CONTINUES } from './config';
import { Game, MENU_ITEMS } from './game';
import { STAGES } from './stages';
import { HEROES } from './defs';
import { drawScene, drawHealthBar, drawGoArrow, drawLayers, drawRig, poseAt, POSES } from '@arcade/brawl';
import type { Layer } from '@arcade/brawl';
import {
  drawText, drawTextCentered, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen, drawInitialsScreen, UI,
} from '@arcade/shared';

interface Theme { sky: [string, string]; far: string; mid: string; ground: string; groundDark: string; path: string }

const THEMES: Record<string, Theme> = {
  wilderness: { sky: ['#3050a0', '#80a8e0'], far: '#405880', mid: '#2c6a3c', ground: '#5a9a40', groundDark: '#3c7a2c', path: '#b89860' },
  village: { sky: ['#2040a0', '#70a0e0'], far: '#3060a0', mid: '#806040', ground: '#8a7a50', groundDark: '#6a5a38', path: '#c8b080' },
  turtle: { sky: ['#1838a0', '#3878d0'], far: '#1050b0', mid: '#2060c0', ground: '#608040', groundDark: '#405828', path: '#8aa060' },
  eagle: { sky: ['#1030a0', '#60a0f0'], far: '#5080d0', mid: '#b09060', ground: '#a08050', groundDark: '#806038', path: '#c8a870' },
  path: { sky: ['#301040', '#905070'], far: '#503050', mid: '#604040', ground: '#705040', groundDark: '#503828', path: '#a07050' },
  gate: { sky: ['#202040', '#605880'], far: '#403860', mid: '#605870', ground: '#606068', groundDark: '#404048', path: '#8a8a90' },
  castle: { sky: ['#181020', '#302030'], far: '#302838', mid: '#403848', ground: '#505058', groundDark: '#383840', path: '#6a6a70' },
  dungeon: { sky: ['#000008', '#100818'], far: '#181020', mid: '#201828', ground: '#302838', groundDark: '#201828', path: '#403848' },
  camp: { sky: ['#080820', '#201848'], far: '#181838', mid: '#203020', ground: '#304830', groundDark: '#203020', path: '#607050' },
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;

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
      this.drawBackground('wilderness', g.time * 12, g.time);
      // the three heroes stand in the title screen
      HERO_IDS.forEach((id, i) => drawRig(ctx, HEROES[id].rig, poseAt(POSES.idle, (g.time + i) % 1.2), 70 + i * 90, 205, i === 2));
      ctx.fillStyle = 'rgba(0,0,0,0.66)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    const shakeX = g.shake > 0 ? Math.round(Math.sin(g.time * 60) * 4 * g.shake) : 0;
    ctx.save();
    ctx.translate(shakeX, 0);
    this.drawBackground(g.brawl.stage.theme, g.brawl.scrollX, g.time);
    drawScene(ctx, g.brawl, { invulnTint: '#ffffff' });
    if (g.magicFx) this.drawMagic(g);
    ctx.restore();
    if (g.brawl.goArrow && g.phase === 'play') drawGoArrow(ctx, W, 120);
    this.drawHud(g);
    this.drawPhase(g);
    if (g.state === 'paused') drawPausedScreen(ctx, W, H, g.pauseIndex);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') drawInitialsScreen(ctx, W, H, `${g.score} PONTOS`, g.initials, g.initialsPos, g.time);
  }

  // ---------- scenery ----------

  private drawBackground(theme: string, scrollX: number, time: number): void {
    const ctx = this.ctx;
    const t = THEMES[theme] ?? THEMES.wilderness;
    const horizon = FLOOR_TOP - 10;
    // sky gradient in bands
    for (let y = HUD_H; y < horizon; y += 4) {
      const k = (y - HUD_H) / (horizon - HUD_H);
      ctx.fillStyle = mix(t.sky[0], t.sky[1], k);
      ctx.fillRect(0, y, W, 4);
    }
    const layers: Layer[] = [
      { speed: 0.2, draw: (c, s) => this.mountains(c, s, horizon, t.far, 48, 40, 11) },
      { speed: 0.45, draw: (c, s) => this.mountains(c, s, horizon + 8, t.mid, 36, 26, 7) },
      { speed: 0.7, draw: (c, s) => this.treeline(c, s, horizon + 10, t) },
    ];
    if (theme === 'village') layers.push({ speed: 0.7, draw: (c, s) => this.huts(c, s, horizon) });
    if (theme === 'castle' || theme === 'gate' || theme === 'dungeon') layers.push({ speed: 0.7, draw: (c, s) => this.walls(c, s, horizon, t) });
    if (theme === 'turtle') layers.push({ speed: 0.1, draw: (c, s) => this.waves(c, s, horizon, time) });
    if (theme === 'eagle') layers.push({ speed: 0.9, draw: (c, s) => this.feathers(c, s, horizon, time) });
    if (theme === 'camp') layers.push({ speed: 0.8, draw: (c, s) => this.campfire(c, s, time) });
    drawLayers(ctx, layers, scrollX);
    // floor band
    ctx.fillStyle = t.ground;
    ctx.fillRect(0, horizon, W, H - horizon);
    ctx.fillStyle = t.groundDark;
    for (let i = 0; i < 60; i++) {
      const x = ((i * 53 + 11) - scrollX) % (W + 40);
      const y = horizon + 6 + ((i * 29) % (H - horizon - 10));
      const bx = Math.round((x + W + 40) % (W + 40)) - 20;
      ctx.fillRect(bx, y, 10 + (i % 5) * 3, 2);
      // grass tufts
      ctx.fillRect(bx + 4, y - 2, 1, 2); ctx.fillRect(bx + 7, y - 3, 1, 3);
    }
    ctx.fillStyle = t.path;
    ctx.fillRect(0, horizon, W, 3);
  }

  /** Bushes and tree tops along the horizon, two tones. */
  private treeline(ctx: CanvasRenderingContext2D, scroll: number, base: number, t: Theme): void {
    const period = 14;
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = Math.round(i * period - (scroll % period));
      const h = 6 + ((k * 7 + 3) % 9);
      ctx.fillStyle = k % 3 ? t.groundDark : t.mid;
      ctx.fillRect(x, base - h, period - 2, h);
      ctx.fillRect(x + 3, base - h - 3, period - 8, 3);
      ctx.fillStyle = t.ground;
      ctx.fillRect(x + 2, base - h + 2, 3, 2);
    }
  }

  private mountains(ctx: CanvasRenderingContext2D, scroll: number, base: number, color: string, period: number, maxH: number, seed: number): void {
    ctx.fillStyle = color;
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = i * period - (scroll % period);
      const h = 10 + ((k * seed + 3) % maxH);
      for (let r = 0; r < h; r++) {
        const half = Math.round(((r + 1) / h) * period * 0.7); // narrow peak, wide foot
        ctx.fillRect(Math.round(x + period / 2 - half), base - h + r, half * 2, 1);
      }
    }
  }

  private huts(ctx: CanvasRenderingContext2D, scroll: number, base: number): void {
    const period = 90;
    for (let i = -1; i < W / period + 2; i++) {
      const x = Math.round(i * period - (scroll % period));
      ctx.fillStyle = '#a07040'; ctx.fillRect(x + 10, base - 24, 40, 24);
      ctx.fillStyle = '#705030'; ctx.fillRect(x + 4, base - 34, 52, 12);
      ctx.fillStyle = '#301808'; ctx.fillRect(x + 24, base - 14, 10, 14);
    }
  }

  private walls(ctx: CanvasRenderingContext2D, scroll: number, base: number, t: Theme): void {
    const period = 64;
    for (let i = -1; i < W / period + 2; i++) {
      const x = Math.round(i * period - (scroll % period));
      ctx.fillStyle = t.mid; ctx.fillRect(x, base - 70, period, 70);
      ctx.fillStyle = t.far;
      for (let r = 0; r < 70; r += 10) for (let c = (r / 10) % 2 ? 0 : 12; c < period; c += 24) ctx.fillRect(x + c, base - 70 + r, 10, 8);
      ctx.fillStyle = '#ffb040'; ctx.fillRect(x + 30, base - 44, 4, 10); // torch
      ctx.fillStyle = '#ff6020'; ctx.fillRect(x + 29, base - 48, 6, 4);
    }
  }

  private waves(ctx: CanvasRenderingContext2D, scroll: number, base: number, time: number): void {
    ctx.fillStyle = '#80c0f0';
    for (let i = 0; i < 20; i++) {
      const x = ((i * 37 - scroll) % (W + 20) + W + 20) % (W + 20) - 10;
      ctx.fillRect(Math.round(x), base - 20 + ((i * 7) % 16) + Math.round(Math.sin(time * 2 + i) * 2), 12, 1);
    }
  }

  private feathers(ctx: CanvasRenderingContext2D, scroll: number, base: number, time: number): void {
    ctx.fillStyle = '#d0b070';
    for (let i = 0; i < 12; i++) {
      const x = ((i * 61 - scroll) % (W + 40) + W + 40) % (W + 40) - 20;
      ctx.fillRect(Math.round(x), base - 6 + Math.round(Math.sin(time * 3 + i) * 2), 30, 4);
    }
  }

  private campfire(ctx: CanvasRenderingContext2D, scroll: number, time: number): void {
    const x = Math.round(160 - scroll * 0.1);
    ctx.fillStyle = '#604020'; ctx.fillRect(x - 10, FLOOR_TOP - 12, 20, 4);
    const f = Math.floor(time * 10) % 3;
    ctx.fillStyle = '#ff8020'; ctx.fillRect(x - 6, FLOOR_TOP - 26 + f, 12, 14 - f);
    ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 3, FLOOR_TOP - 20 + f, 6, 8 - f);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 30; i++) ctx.fillRect((i * 97) % W, HUD_H + 6 + (i * 31) % 90, 1, 1); // stars
  }

  // ---------- magic ----------

  private drawMagic(g: Game): void {
    const ctx = this.ctx;
    const fx = g.magicFx!;
    const k = fx.t / 1.4;
    const n = 4 + fx.level * 3;
    if (fx.kind === 'gilius') {
      ctx.fillStyle = k < 0.5 && Math.floor(fx.t * 30) % 2 ? 'rgba(200,220,255,0.35)' : 'rgba(0,0,0,0)';
      ctx.fillRect(0, HUD_H, W, H - HUD_H);
      ctx.fillStyle = '#e0f0ff';
      for (let i = 0; i < n; i++) {
        let x = ((i * 67 + 20) % W) + Math.sin(fx.t * 40 + i) * 4;
        let y = HUD_H;
        while (y < FLOOR_TOP + 30) { const ny = y + 12; const nx = x + (Math.sin(y * 0.3 + i + fx.t * 10) * 10); if (fx.t < 0.9) ctx.fillRect(Math.round(Math.min(x, nx)), y, Math.abs(Math.round(nx - x)) + 2, 3); x = nx; y = ny; }
      }
    } else if (fx.kind === 'tyris') {
      for (let i = 0; i < n * 2; i++) {
        const x = (i * 41 + 10) % W;
        const h = 30 + fx.level * 10 + Math.sin(fx.t * 20 + i) * 10;
        const y = FLOOR_TOP + 50 - h * Math.min(1, k * 3) + 10;
        ctx.fillStyle = i % 2 ? '#ff6020' : '#ffd040';
        ctx.fillRect(x, y, 10, h * Math.min(1, k * 3));
        ctx.fillStyle = '#fff0a0';
        ctx.fillRect(x + 3, y + 4, 4, h * 0.5);
      }
      if (k > 0.8) { ctx.fillStyle = `rgba(255,120,40,${(1 - k) * 2})`; ctx.fillRect(0, HUD_H, W, H - HUD_H); }
    } else {
      // earth: boulders burst up from the ground
      for (let i = 0; i < n; i++) {
        const x = (i * 53 + 30) % W;
        const rise = Math.sin(Math.min(Math.PI, k * Math.PI * 1.2)) * (30 + fx.level * 8);
        const y = FLOOR_TOP + 40 - rise + ((i * 13) % 20);
        ctx.fillStyle = '#806040'; ctx.fillRect(x - 8, y - 10, 16, 12);
        ctx.fillStyle = '#b09060'; ctx.fillRect(x - 6, y - 10, 10, 4);
      }
      ctx.fillStyle = `rgba(120,80,40,${0.3 * (1 - k)})`;
      ctx.fillRect(0, FLOOR_TOP - 10, W, H - FLOOR_TOP + 10);
    }
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, HUD_H);
    const h = g.hero;
    const bars = Math.ceil(h.maxHp / BAR);
    drawText(ctx, g.heroName, 6, 3, UI.text);
    // life bars like the cartridge: one block per bar, the current bar partially filled
    for (let i = 0; i < bars; i++) {
      const x = 6 + i * 18;
      ctx.fillStyle = '#202830';
      ctx.fillRect(x, 12, 16, 6);
      const fill = Math.max(0, Math.min(BAR, h.hp - i * BAR)) / BAR;
      if (fill > 0) { ctx.fillStyle = i === bars - 1 && fill < 1 ? '#ff8040' : '#f04040'; ctx.fillRect(x + 1, 13, Math.round(14 * fill), 4); }
    }
    // magic pots
    const px = 6 + bars * 18 + 8;
    for (let i = 0; i < MAX_POTS[g.heroId]; i++) {
      const x = px + i * 9;
      ctx.fillStyle = i < h.magic ? '#58a8ff' : '#203040';
      ctx.fillRect(x, 12, 6, 6);
      ctx.fillStyle = i < h.magic ? '#2860c0' : '#182838';
      ctx.fillRect(x + 1, 10, 4, 2);
    }
    drawText(ctx, MAGIC_NAMES[g.heroId], px, 20, UI.dim);
    drawText(ctx, `${String(g.score).padStart(7, '0')}`, W - 6 - 7 * 4, 3, UI.text);
    drawText(ctx, `VIDAS ${g.lives}  CRED ${g.continues}`, W - 6 - 15 * 4, 12, UI.dim);
    drawText(ctx, `FASE ${g.stageIndex + 1}`, W - 6 - 6 * 4, 20, UI.dim);
    // the enemy that was hit last
    if (g.focus && g.focusT > 0 && !g.focus.dead) {
      drawHealthBar(ctx, 120, 3, g.focus.def.name, Math.max(0, g.focus.hp), g.focus.maxHp, '#e0c040', 80);
    }
  }

  private drawPhase(g: Game): void {
    const ctx = this.ctx;
    switch (g.phase) {
      case 'intro':
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 90, W, 44);
        drawTextCentered(ctx, `FASE ${g.stageIndex + 1}`, W / 2, 98, UI.gold, 2);
        drawTextCentered(ctx, g.stage.name, W / 2, 118, UI.text);
        break;
      case 'camp':
        drawTextCentered(ctx, 'ACAMPAMENTO: BATA NOS LADROES', W / 2, HUD_H + 6, UI.gold);
        drawTextCentered(ctx, `${Math.max(0, Math.ceil(9 - g.phaseTime))}`, W / 2, HUD_H + 16, UI.text);
        break;
      case 'continue':
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 70, W, 80);
        drawTextCentered(ctx, 'CONTINUAR?', W / 2, 84, UI.gold, 2);
        drawTextCentered(ctx, String(Math.max(0, Math.ceil(g.continueT))), W / 2, 108, UI.text, 2);
        drawTextCentered(ctx, `CREDITOS ${g.continues} DE ${CONTINUES}  ATAQUE CONTINUA`, W / 2, 132, UI.dim);
        break;
      case 'clear':
        drawTextCentered(ctx, 'FASE CONCLUIDA', W / 2, 100, UI.gold, 2);
        break;
      case 'ending':
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 50, W, 130);
        drawTextCentered(ctx, 'DEATH BRINGER CAIU', W / 2, 62, UI.gold, 2);
        ['A PAZ VOLTOU A YURIA.', 'O MACHADO DOURADO ESTA', 'DE VOLTA AO POVO.', '', `${g.heroName}: ${g.score} PONTOS`].forEach((l, i) => drawTextCentered(ctx, l, W / 2, 92 + i * 12, UI.text));
        if (g.phaseTime >= 6) drawTextCentered(ctx, 'ATAQUE CONTINUA', W / 2, 160, UI.dim);
        break;
      default: break;
    }
  }

  // ---------- screens ----------

  private drawMenu(g: Game): void {
    drawMenuScreen(this.ctx, W, H, {
      title: 'GOLDEN AXE', titleColor: '#f0c040', subtitle: 'TRES HEROIS CONTRA DEATH ADDER',
      labels: MENU_ITEMS.map((item) => item === 'HEROI' ? `HEROI: ${HERO_NAMES[g.heroId]}` : item === 'DIFICULDADE' ? `DIFICULDADE: ${g.difficultyName}` : g.shell.label(item)),
      selected: g.menuIndex, time: g.time, titleY: 24, itemsY: 66, itemGap: 11,
      footer: ['SETAS ANDAM  ESPACO ATACA  Z PULA  V MAGIA', 'SEGA 1989  EDICAO BROWSER'], footerY: 194,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'ATAQUE 3 VEZES PARA O COMBO QUE DERRUBA',
      'TOQUE DUAS VEZES NA DIRECAO PARA CORRER',
      'CORRENDO + ATAQUE = INVESTIDA  PULO + ATAQUE = VOADORA',
      'ANDE CONTRA O INIMIGO PARA AGARRAR',
      'AGARRADO: ATAQUE DA JOELHADAS  PULO ARREMESSA',
      'MAGIA GASTA TODOS OS POTES: QUANTO MAIS, MAIS FORTE',
      `AX 4 POTES  TYRIS 6 POTES  GILIUS 3 POTES`,
      'LADROES AZUIS SOLTAM POTES  VERDES SOLTAM CARNE',
      'PULE SOBRE UM BIZARRIAN OU DRAGAO PARA MONTAR',
      `${STAGES.length} FASES ATE DEATH ADDER E DEATH BRINGER`,
      '3 VIDAS E 3 CREDITOS',
    ], { y0: 48, gap: 12 });
  }

  private drawRanking(g: Game, menu: boolean): void {
    drawRankingScreen(this.ctx, W, H, [], menu, { shell: g.shell });
  }

  private drawGameOver(g: Game): void {
    drawGameOverScreen(this.ctx, W, H, {
      lines: [`PONTOS ${g.score}`, `FASE ${g.stageIndex + 1}  ${g.stage.name}`, g.modeName],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }
}

function mix(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
