import { W, H, HUD_H, FLOOR_TOP, BAR_SEGMENTS, MAX_SPECIALS, HERO_IDS, HERO_FULL_NAMES, CONTINUES, POLICE_BLAST_AT, POLICE_TIME, HERO_HP } from './config';
import { Game, MENU_ITEMS } from './game';
import { STAGES } from './stages';
import { roundStrips } from './scenery';
import { HEROES, WEAPON_NAMES } from './defs';
import { drawScene, drawHealthBar, drawGoArrow, drawLayers, drawRig, drawStrips, poseAt, POSES } from '@arcade/brawl';
import type { Layer, Item, Projectile } from '@arcade/brawl';
import {
  drawText, drawTextCentered, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen, drawInitialsScreen, UI,
} from '@arcade/shared';

interface Theme { sky: [string, string]; far: string; mid: string; ground: string; groundDark: string; edge: string }

const THEMES: Record<string, Theme> = {
  street: { sky: ['#08081c', '#2a1850'], far: '#181a38', mid: '#2c2a50', ground: '#3a3a44', groundDark: '#2a2a32', edge: '#8a8a90' },
  alley: { sky: ['#0a0a14', '#201828'], far: '#302030', mid: '#5a3a30', ground: '#4a4a50', groundDark: '#3a3a40', edge: '#6a6a70' },
  beach: { sky: ['#e05030', '#f8b060'], far: '#1848a0', mid: '#2868c0', ground: '#e0c070', groundDark: '#c8a858', edge: '#f0e0a0' },
  bridge: { sky: ['#040814', '#182048'], far: '#101830', mid: '#303848', ground: '#404048', groundDark: '#303038', edge: '#a0a0a8' },
  ship: { sky: ['#081028', '#204070'], far: '#103060', mid: '#506070', ground: '#8a6a40', groundDark: '#705430', edge: '#c0c8d0' },
  factory: { sky: ['#100c10', '#282030'], far: '#302838', mid: '#504858', ground: '#505860', groundDark: '#404850', edge: '#a0a8b0' },
  elevator: { sky: ['#201c28', '#302838'], far: '#282030', mid: '#484050', ground: '#585060', groundDark: '#484050', edge: '#c0b8c8' },
  hq: { sky: ['#100820', '#301850'], far: '#281840', mid: '#503060', ground: '#802030', groundDark: '#601828', edge: '#c0a040' },
};

const PROJECTILE_COLOURS: Record<string, string> = { knife: '#e0e8f0', boomerang: '#e0c060', flame: '#ff8020', bullet: '#ffe060' };

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
      this.drawBackground('street', g.time * 14, g.time);
      // the three heroes stand on the street in the title screen
      HERO_IDS.forEach((id, i) => drawRig(ctx, HEROES[id].rig, poseAt(POSES.idle, (g.time + i * 0.4) % 1.2), 70 + i * 90, 206, i === 2));
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
    drawScene(ctx, g.brawl, { invulnTint: '#ffffff', item: drawSrItem, projectile: drawSrProjectile });
    if (g.policeFx) this.drawPolice(g);
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
    const t = THEMES[theme] ?? THEMES.street;
    const horizon = FLOOR_TOP - 10;
    // 16-bit painted strips (the elevator keeps its animated shaft); flat drawing is the headless fallback
    if (theme !== 'elevator' && drawStrips(ctx, roundStrips(theme, HUD_H, horizon), scrollX, W)) {
      if (theme === 'street') drawLayers(ctx, [{ speed: 1, draw: (c, s) => this.lamps(c, s, horizon) }], scrollX);
      if (theme === 'bridge') drawLayers(ctx, [{ speed: 1, draw: (c, s) => this.railing(c, s, horizon, t.edge, 28) }], scrollX);
      if (theme === 'ship') drawLayers(ctx, [{ speed: 1, draw: (c, s) => this.railing(c, s, horizon, t.edge, 22) }], scrollX);
      return;
    }
    for (let y = HUD_H; y < horizon; y += 4) {
      const k = (y - HUD_H) / (horizon - HUD_H);
      ctx.fillStyle = mix(t.sky[0], t.sky[1], k);
      ctx.fillRect(0, y, W, 4);
    }
    const layers: Layer[] = [];
    switch (theme) {
      case 'street':
        this.stars(ctx, 24, time);
        layers.push({ speed: 0.2, draw: (c, s) => this.skyline(c, s, horizon - 56, t.far, 17) });
        layers.push({ speed: 0.55, draw: (c, s) => this.shopFronts(c, s, horizon, time) });
        layers.push({ speed: 1, draw: (c, s) => this.lamps(c, s, horizon) });
        break;
      case 'alley':
        layers.push({ speed: 0.6, draw: (c, s) => this.brickWall(c, s, horizon, t) });
        layers.push({ speed: 1, draw: (c, s) => this.alleyProps(c, s, horizon) });
        break;
      case 'beach':
        this.stars(ctx, 0, 0);
        layers.push({ speed: 0.1, draw: (c, s) => this.sea(c, s, horizon - 30, horizon, time, t) });
        layers.push({ speed: 0.6, draw: (c, s) => this.palms(c, s, horizon, time) });
        break;
      case 'bridge':
        this.stars(ctx, 40, time);
        layers.push({ speed: 0.15, draw: (c, s) => this.skyline(c, s, horizon - 20, t.far, 23) });
        layers.push({ speed: 0.5, draw: (c, s) => this.cables(c, s, horizon) });
        layers.push({ speed: 1, draw: (c, s) => this.railing(c, s, horizon, t.edge, 28) });
        break;
      case 'ship':
        this.stars(ctx, 30, time);
        layers.push({ speed: 0.1, draw: (c, s) => this.sea(c, s, horizon - 36, horizon - 22, time, t) });
        layers.push({ speed: 0.6, draw: (c, s) => this.cabin(c, s, horizon, t) });
        layers.push({ speed: 1, draw: (c, s) => this.railing(c, s, horizon, t.edge, 22) });
        break;
      case 'factory':
        layers.push({ speed: 0.4, draw: (c, s) => this.pipes(c, s, horizon, t) });
        layers.push({ speed: 0.75, draw: (c, s) => this.machines(c, s, horizon, time, t) });
        break;
      case 'elevator':
        layers.push({ speed: 0, draw: (c) => this.elevator(c, horizon, time, t) });
        break;
      case 'hq':
        layers.push({ speed: 0.2, draw: (c, s) => this.cityLights(c, s, horizon) });
        layers.push({ speed: 0.7, draw: (c, s) => this.office(c, s, horizon, t) });
        break;
    }
    drawLayers(ctx, layers, scrollX);
    this.floor(theme, scrollX, horizon, t);
  }

  private floor(theme: string, scrollX: number, horizon: number, t: Theme): void {
    const ctx = this.ctx;
    ctx.fillStyle = t.ground;
    ctx.fillRect(0, horizon, W, H - horizon);
    ctx.fillStyle = t.edge;
    ctx.fillRect(0, horizon, W, 2);
    ctx.fillStyle = t.groundDark;
    switch (theme) {
      case 'street': case 'bridge': { // sidewalk band, then the road with a dashed centre line
        ctx.fillRect(0, horizon + 24, W, H - horizon - 24);
        ctx.fillStyle = '#d0c040';
        for (let i = -1; i < 8; i++) ctx.fillRect(Math.round(i * 48 - (scrollX % 48)), horizon + 48, 24, 2);
        ctx.fillStyle = t.edge;
        for (let i = -1; i < 12; i++) ctx.fillRect(Math.round(i * 32 - (scrollX % 32)), horizon + 2, 1, 22);
        break;
      }
      case 'ship': // planks
        for (let i = -1; i < 12; i++) ctx.fillRect(Math.round(i * 30 - (scrollX % 30)), horizon + 2, 2, H - horizon);
        for (let y = horizon + 14; y < H; y += 14) ctx.fillRect(0, y, W, 1);
        break;
      case 'factory': case 'elevator': // metal plate with rivets
        for (let y = horizon + 10; y < H; y += 16) for (let i = -1; i < 12; i++) ctx.fillRect(Math.round(i * 32 - (scrollX % 32)), y, 3, 3);
        break;
      case 'hq': // carpet pattern
        for (let y = horizon + 6; y < H; y += 12) for (let i = -1; i < 14; i++) ctx.fillRect(Math.round(i * 24 - (scrollX % 24) + ((y / 12) % 2) * 12), y, 12, 2);
        break;
      default: // beach sand, alley concrete: scattered marks
        for (let i = 0; i < 50; i++) {
          const x = ((i * 53 + 11) - scrollX) % (W + 40);
          ctx.fillRect(Math.round((x + W + 40) % (W + 40)) - 20, horizon + 6 + ((i * 29) % (H - horizon - 10)), 8 + (i % 5) * 3, 2);
        }
        break;
    }
  }

  private stars(ctx: CanvasRenderingContext2D, n: number, time: number): void {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < n; i++) if (Math.floor(time * 3 + i) % 7) ctx.fillRect((i * 97) % W, HUD_H + 4 + (i * 31) % 70, 1, 1);
  }

  private skyline(ctx: CanvasRenderingContext2D, scroll: number, base: number, color: string, seed: number): void {
    const period = 28;
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = Math.round(i * period - (scroll % period));
      const h = 24 + ((k * seed + 5) % 60);
      ctx.fillStyle = color;
      ctx.fillRect(x, base - h, period - 4, h);
      ctx.fillStyle = (k % 3) ? '#e0d080' : '#80c0ff';
      for (let r = 6; r < h - 4; r += 8) for (let c = 3; c < period - 8; c += 7) if ((k * 7 + r + c) % 5) ctx.fillRect(x + c, base - h + r, 3, 4);
    }
  }

  private shopFronts(ctx: CanvasRenderingContext2D, scroll: number, base: number, time: number): void {
    const period = 110;
    const neon = ['#ff40a0', '#40e0ff', '#ffe040', '#40ff80'];
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = Math.round(i * period - (scroll % period));
      ctx.fillStyle = '#3a3658'; ctx.fillRect(x, base - 78, period, 78);
      ctx.fillStyle = '#28243c'; ctx.fillRect(x + 6, base - 72, period - 12, 30);
      // windows above the shop
      ctx.fillStyle = '#e8d890';
      for (let c = 10; c < period - 14; c += 16) if ((k + c) % 3) ctx.fillRect(x + c, base - 66, 8, 10);
      // shop window and door
      ctx.fillStyle = '#50c0e0'; ctx.fillRect(x + 8, base - 36, 48, 30);
      ctx.fillStyle = '#301020'; ctx.fillRect(x + 66, base - 36, 20, 36);
      // neon sign blinking in its own rhythm
      const on = Math.floor(time * 2 + k) % 4 !== 0;
      ctx.fillStyle = on ? neon[k & 3] : '#503050';
      ctx.fillRect(x + 10, base - 48, 60, 8);
      if (on) { ctx.fillStyle = '#ffffff'; for (let c = 0; c < 6; c++) ctx.fillRect(x + 14 + c * 9, base - 46, 4, 4); }
      // awning
      ctx.fillStyle = neon[(k + 1) & 3]; ctx.fillRect(x + 4, base - 40, 60, 3);
    }
  }

  private lamps(ctx: CanvasRenderingContext2D, scroll: number, base: number): void {
    const period = 160;
    for (let i = -1; i < W / period + 2; i++) {
      const x = Math.round(i * period - (scroll % period)) + 20;
      ctx.fillStyle = '#606068'; ctx.fillRect(x, base - 60, 3, 60);
      ctx.fillRect(x, base - 60, 12, 3);
      ctx.fillStyle = '#fff0a0'; ctx.fillRect(x + 9, base - 59, 6, 5);
      ctx.fillStyle = 'rgba(255,240,160,0.08)'; ctx.fillRect(x - 6, base - 54, 36, 54);
    }
  }

  private brickWall(ctx: CanvasRenderingContext2D, scroll: number, base: number, t: Theme): void {
    ctx.fillStyle = t.mid; ctx.fillRect(0, HUD_H, W, base - HUD_H);
    ctx.fillStyle = t.far;
    for (let r = 0; r < base - HUD_H; r += 8) {
      const off = (r / 8) % 2 ? 0 : 8;
      for (let i = -1; i < W / 16 + 2; i++) {
        const x = Math.round(i * 16 - (scroll % 16)) + off;
        ctx.fillRect(x, HUD_H + r + 6, 16, 1);
        ctx.fillRect(x, HUD_H + r, 1, 8);
      }
    }
    // graffiti patches
    const period = 180;
    const colours = ['#e04080', '#40c0e0', '#e0e040'];
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = Math.round(i * period - (scroll % period)) + 30;
      ctx.fillStyle = colours[k % 3 < 0 ? 0 : k % 3];
      for (let c = 0; c < 5; c++) ctx.fillRect(x + c * 10, base - 50 + ((k + c) % 3) * 6, 7, 14);
      ctx.fillStyle = '#101010'; ctx.fillRect(x + 2, base - 44, 46, 2);
    }
  }

  private alleyProps(ctx: CanvasRenderingContext2D, scroll: number, base: number): void {
    const period = 140;
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = Math.round(i * period - (scroll % period));
      if (k % 2) { // dumpster
        ctx.fillStyle = '#306030'; ctx.fillRect(x + 20, base - 26, 40, 26);
        ctx.fillStyle = '#204020'; ctx.fillRect(x + 18, base - 30, 44, 5);
        ctx.fillStyle = '#101010'; ctx.fillRect(x + 22, base - 2, 6, 3); ctx.fillRect(x + 52, base - 2, 6, 3);
      } else { // chain-link fence panel
        ctx.fillStyle = '#9098a0';
        for (let c = 0; c < 60; c += 6) ctx.fillRect(x + 30 + c, base - 40, 1, 40);
        for (let r = 0; r < 40; r += 6) ctx.fillRect(x + 30, base - 40 + r, 60, 1);
        ctx.fillRect(x + 28, base - 42, 2, 42); ctx.fillRect(x + 90, base - 42, 2, 42);
      }
    }
  }

  private sea(ctx: CanvasRenderingContext2D, scroll: number, top: number, bottom: number, time: number, t: Theme): void {
    ctx.fillStyle = t.far; ctx.fillRect(0, top, W, bottom - top);
    ctx.fillStyle = t.mid; ctx.fillRect(0, top, W, 3);
    ctx.fillStyle = '#c0e8ff';
    for (let i = 0; i < 24; i++) {
      const x = ((i * 41 - scroll + time * 8) % (W + 20) + W + 20) % (W + 20) - 10;
      ctx.fillRect(Math.round(x), top + 4 + ((i * 7) % (bottom - top - 6)) + Math.round(Math.sin(time * 2 + i) * 1.5), 10 + (i % 3) * 4, 1);
    }
  }

  private palms(ctx: CanvasRenderingContext2D, scroll: number, base: number, time: number): void {
    const period = 150;
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = Math.round(i * period - (scroll % period)) + 40;
      const sway = Math.sin(time * 1.5 + k) * 2;
      ctx.fillStyle = '#705030';
      for (let r = 0; r < 50; r += 4) ctx.fillRect(Math.round(x + (r / 50) * 6 + (r > 30 ? sway : 0)), base - r - 4, 4, 5);
      // fronds: five arcs drooping from the crown
      const tx = x + 8 + sway, ty = base - 56;
      for (let f = 0; f < 5; f++) {
        const a = -1.3 + f * 0.65;
        ctx.fillStyle = f % 2 ? '#30a040' : '#208030';
        for (let r = 2; r < 20; r += 2) ctx.fillRect(Math.round(tx + Math.sin(a) * r), Math.round(ty - Math.cos(a) * r * 0.5 + (r * r) / 30), 3, 3);
      }
      ctx.fillStyle = '#a06020'; ctx.fillRect(Math.round(tx - 2), ty - 2, 6, 4); // coconuts
    }
  }

  private cables(ctx: CanvasRenderingContext2D, scroll: number, base: number): void {
    const period = 260;
    for (let i = -1; i < W / period + 2; i++) {
      const x = Math.round(i * period - (scroll % period));
      ctx.fillStyle = '#8890a0'; ctx.fillRect(x + 120, HUD_H, 10, base - HUD_H); ctx.fillRect(x + 118, HUD_H + 30, 14, 4);
      ctx.fillStyle = '#b8c0d0';
      for (let c = 0; c < 110; c += 6) { const h = ((c / 110) ** 2) * (base - HUD_H - 10); ctx.fillRect(x + 120 - c, HUD_H + 4 + Math.round(h), 2, 2); ctx.fillRect(x + 130 + c, HUD_H + 4 + Math.round(h), 2, 2); }
      for (let c = 0; c < 110; c += 22) { const h = ((c / 110) ** 2) * (base - HUD_H - 10); ctx.fillRect(x + 120 - c, HUD_H + 4 + Math.round(h), 1, base - HUD_H - 4 - Math.round(h)); ctx.fillRect(x + 130 + c, HUD_H + 4 + Math.round(h), 1, base - HUD_H - 4 - Math.round(h)); }
    }
  }

  private railing(ctx: CanvasRenderingContext2D, scroll: number, base: number, color: string, h: number): void {
    ctx.fillStyle = color;
    ctx.fillRect(0, base - h, W, 3); ctx.fillRect(0, base - h / 2, W, 2);
    for (let i = -1; i < W / 24 + 2; i++) ctx.fillRect(Math.round(i * 24 - (scroll % 24)), base - h, 2, h);
  }

  private cabin(ctx: CanvasRenderingContext2D, scroll: number, base: number, t: Theme): void {
    const period = 200;
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = Math.round(i * period - (scroll % period));
      ctx.fillStyle = t.mid; ctx.fillRect(x, base - 60, period - 30, 40);
      ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x, base - 62, period - 30, 3);
      ctx.fillStyle = '#80d0ff';
      for (let c = 12; c < period - 50; c += 22) { ctx.fillRect(x + c, base - 48, 8, 8); ctx.fillStyle = '#404850'; ctx.fillRect(x + c - 1, base - 49, 10, 1); ctx.fillStyle = '#80d0ff'; }
      if (k % 2 === 0) { ctx.fillStyle = '#c03030'; ctx.fillRect(x + 60, base - 96, 24, 36); ctx.fillStyle = '#202020'; ctx.fillRect(x + 60, base - 100, 24, 6); }
      ctx.fillStyle = '#c0c8d0'; ctx.fillRect(x + period - 30, base - 30, 30, 12); // crate
    }
  }

  private pipes(ctx: CanvasRenderingContext2D, scroll: number, base: number, t: Theme): void {
    ctx.fillStyle = t.far; ctx.fillRect(0, HUD_H, W, base - HUD_H);
    for (let r = 0; r < 4; r++) {
      const y = HUD_H + 8 + r * 22;
      ctx.fillStyle = r % 2 ? '#6a6a78' : '#8a7a60'; ctx.fillRect(0, y, W, 8);
      ctx.fillStyle = r % 2 ? '#404048' : '#5a5040';
      for (let i = -1; i < W / 70 + 2; i++) ctx.fillRect(Math.round(i * 70 - (scroll % 70)) + r * 9, y - 1, 6, 10);
    }
  }

  private machines(ctx: CanvasRenderingContext2D, scroll: number, base: number, time: number, t: Theme): void {
    const period = 130;
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = Math.round(i * period - (scroll % period));
      ctx.fillStyle = t.mid; ctx.fillRect(x + 10, base - 56, 80, 56);
      ctx.fillStyle = '#282030'; ctx.fillRect(x + 16, base - 50, 68, 20);
      // gear: a square with teeth turning with time
      const cx = x + 50, cy = base - 40, r = 10;
      const a = time * (k % 2 ? 2 : -2);
      ctx.fillStyle = '#c0a040';
      for (let s = 0; s < 8; s++) ctx.fillRect(Math.round(cx + Math.cos(a + s * Math.PI / 4) * r) - 2, Math.round(cy + Math.sin(a + s * Math.PI / 4) * r) - 2, 4, 4);
      ctx.fillRect(cx - 5, cy - 5, 10, 10);
      // blinking lights
      ctx.fillStyle = Math.floor(time * 4 + k) % 2 ? '#ff4040' : '#40ff40'; ctx.fillRect(x + 20, base - 24, 4, 4);
      ctx.fillStyle = '#ffe040'; ctx.fillRect(x + 28, base - 24, 4, 4);
      ctx.fillStyle = '#a0a8b0'; ctx.fillRect(x + 40, base - 26, 40, 8);
    }
  }

  private elevator(ctx: CanvasRenderingContext2D, base: number, time: number, t: Theme): void {
    // the cage walls, and the shaft passing by outside: floor markers moving downward
    ctx.fillStyle = t.far; ctx.fillRect(0, HUD_H, W, base - HUD_H);
    const shaftY = (time * 90) % 60;
    ctx.fillStyle = '#383040';
    for (let y = HUD_H - 60 + shaftY; y < base; y += 60) { ctx.fillRect(0, Math.round(y), W, 6); }
    ctx.fillStyle = '#c0b060';
    for (let y = HUD_H - 60 + shaftY; y < base; y += 60) { ctx.fillRect(40, Math.round(y) + 10, 20, 8); ctx.fillRect(W - 60, Math.round(y) + 10, 20, 8); }
    // cage bars in front
    ctx.fillStyle = t.mid;
    for (let x = 0; x < W; x += 20) ctx.fillRect(x, HUD_H, 3, base - HUD_H);
    ctx.fillRect(0, HUD_H, W, 6); ctx.fillRect(0, base - 30, W, 3);
    ctx.fillStyle = t.edge; ctx.fillRect(0, HUD_H + 6, W, 1);
    // the floor counter above the door, climbing as the cage rises
    ctx.fillStyle = '#181418'; ctx.fillRect(W / 2 - 22, HUD_H + 8, 44, 12);
    ctx.fillStyle = Math.floor(time * 2) % 2 ? '#ff6040' : '#ffc040'; ctx.fillRect(W / 2 - 20, HUD_H + 10, 4, 8);
    drawText(ctx, `${String(1 + Math.floor(time / 0.67) % 60).padStart(2, '0')}`, W / 2 - 10, HUD_H + 11, '#ff8040', 1);
    drawText(ctx, 'F', W / 2 + 4, HUD_H + 11, '#ff8040', 1);
  }

  private cityLights(ctx: CanvasRenderingContext2D, scroll: number, base: number): void {
    this.skyline(ctx, scroll, base - 20, '#181030', 13);
  }

  private office(ctx: CanvasRenderingContext2D, scroll: number, base: number, t: Theme): void {
    const period = 160;
    for (let i = -1; i < W / period + 2; i++) {
      const k = Math.floor((scroll + i * period) / period);
      const x = Math.round(i * period - (scroll % period));
      // window frame with the city behind (already drawn), then a column
      ctx.fillStyle = t.mid; ctx.fillRect(x, HUD_H, 14, base - HUD_H); ctx.fillRect(x, base - 24, period, 24);
      ctx.fillStyle = t.edge; ctx.fillRect(x, base - 24, period, 2); ctx.fillRect(x + 12, HUD_H, 2, base - HUD_H);
      ctx.fillStyle = '#403048'; ctx.fillRect(x + 14, HUD_H + 40, period - 14, 2);
      if (k % 2) { // the boss's desk and a painting
        ctx.fillStyle = '#5a3020'; ctx.fillRect(x + 40, base - 44, 70, 20);
        ctx.fillStyle = '#c0a040'; ctx.fillRect(x + 60, base - 50, 30, 20); ctx.fillStyle = '#402060'; ctx.fillRect(x + 63, base - 47, 24, 14);
      } else {
        ctx.fillStyle = '#304030'; ctx.fillRect(x + 100, base - 60, 14, 36); ctx.fillStyle = '#806040'; ctx.fillRect(x + 102, base - 26, 10, 4); // plant
      }
    }
  }

  // ---------- police ----------

  /** The police car pulls up at the bottom, the officer fires the napalm, the street lights up. */
  private drawPolice(g: Game): void {
    const ctx = this.ctx;
    const fx = g.policeFx!;
    const t = fx.t;
    const k = Math.min(1, t / 0.6);
    const x = Math.round(-100 + (1 - (1 - k) * (1 - k)) * 130);
    const y = H - 30;
    // car body: white with blue doors, light bar flashing
    ctx.fillStyle = '#f0f0f8'; ctx.fillRect(x, y, 80, 18);
    ctx.fillStyle = '#2040c0'; ctx.fillRect(x + 20, y, 36, 18); ctx.fillRect(x, y + 10, 80, 8);
    ctx.fillStyle = '#80c0ff'; ctx.fillRect(x + 24, y + 2, 12, 7); ctx.fillRect(x + 40, y + 2, 12, 7);
    ctx.fillStyle = '#101010'; ctx.fillRect(x + 10, y + 16, 12, 6); ctx.fillRect(x + 58, y + 16, 12, 6);
    ctx.fillStyle = Math.floor(t * 10) % 2 ? '#ff3030' : '#3060ff'; ctx.fillRect(x + 32, y - 4, 14, 4);
    drawText(ctx, 'POLICE', x + 22, y + 11, '#f0f0f8');
    // the officer leaning out with the launcher
    ctx.fillStyle = '#2040c0'; ctx.fillRect(x + 58, y - 8, 8, 10);
    ctx.fillStyle = '#f0c090'; ctx.fillRect(x + 59, y - 14, 6, 6);
    ctx.fillStyle = '#404048'; ctx.fillRect(x + 64, y - 10, 16, 3);
    // the rocket flies from the launcher to the middle of the street
    if (t > 0.5 && t < POLICE_BLAST_AT) {
      const kk = (t - 0.5) / (POLICE_BLAST_AT - 0.5);
      const rx = x + 80 + kk * (W / 2 - x - 60);
      const ry = y - 10 - Math.sin(kk * Math.PI) * 60;
      ctx.fillStyle = '#ffe060'; ctx.fillRect(Math.round(rx), Math.round(ry), 10, 4);
      ctx.fillStyle = '#ff8020'; ctx.fillRect(Math.round(rx) - 6, Math.round(ry) + 1, 6, 2);
    }
    if (fx.blasted) {
      const b = (t - POLICE_BLAST_AT) / (POLICE_TIME - POLICE_BLAST_AT);
      if (b < 0.12) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(0, HUD_H, W, H - HUD_H); }
      // napalm: columns of fire along the street
      for (let i = 0; i < 14; i++) {
        const fxX = (i * 23 + 8) % W;
        const h = (30 + ((i * 17) % 30)) * Math.sin(Math.min(Math.PI, b * Math.PI * 1.1)) + Math.sin(g.time * 30 + i) * 6;
        const base = FLOOR_TOP + 20 + ((i * 13) % 40);
        ctx.fillStyle = i % 2 ? '#ff6020' : '#ffc030';
        ctx.fillRect(fxX, base - h, 12, h);
        ctx.fillStyle = '#fff0a0';
        ctx.fillRect(fxX + 4, base - h * 0.6, 4, h * 0.6);
      }
      ctx.fillStyle = `rgba(255,120,40,${0.3 * (1 - b)})`;
      ctx.fillRect(0, HUD_H, W, H - HUD_H);
    }
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, HUD_H);
    const h = g.hero;
    drawText(ctx, g.heroName, 6, 3, UI.text);
    drawText(ctx, `x${g.lives}`, 6 + g.heroName.length * 4 + 6, 3, UI.dim);
    // the long health bar of the cartridge: 12 segments, going from green to red
    const segW = 8;
    const ratio = h.hp / HERO_HP;
    const colour = ratio > 0.5 ? '#40d040' : ratio > 0.25 ? '#f0d040' : '#f04040';
    for (let i = 0; i < BAR_SEGMENTS; i++) {
      const x = 6 + i * segW;
      ctx.fillStyle = '#202830';
      ctx.fillRect(x, 12, segW - 1, 6);
      const fill = Math.max(0, Math.min(1, h.hp / (HERO_HP / BAR_SEGMENTS) - i));
      if (fill > 0) { ctx.fillStyle = colour; ctx.fillRect(x, 13, Math.round((segW - 1) * fill), 4); }
    }
    // police calls: one little car per special
    for (let i = 0; i < MAX_SPECIALS; i++) {
      const x = 6 + i * 14;
      const on = i < h.magic;
      ctx.fillStyle = on ? '#4060e0' : '#202838'; ctx.fillRect(x, 21, 11, 4);
      ctx.fillStyle = on ? '#ffffff' : '#283040'; ctx.fillRect(x + 3, 19, 5, 2);
      ctx.fillStyle = on ? '#ff3030' : '#283040'; ctx.fillRect(x + 5, 18, 2, 1);
    }
    drawText(ctx, h.weapon ? (WEAPON_NAMES[h.weapon] ?? h.weapon.toUpperCase()) : 'POLICIA', 50, 20, UI.dim);
    drawText(ctx, `${String(g.score).padStart(7, '0')}`, W - 6 - 7 * 4, 3, UI.text);
    drawText(ctx, `CRED ${g.continues}`, W - 6 - 6 * 4, 12, UI.dim);
    drawText(ctx, `ROUND ${g.roundIndex + 1}`, W - 6 - 7 * 4, 20, UI.dim);
    // the enemy that was hit last
    if (g.focus && g.focusT > 0 && !g.focus.dead) {
      drawHealthBar(ctx, 124, 3, g.focus.def.name, Math.max(0, g.focus.hp), g.focus.maxHp, '#e0c040', 80);
    }
    if (g.noticeT > 0 && g.phase === 'play') drawTextCentered(ctx, g.notice, 164, 20, UI.gold);
  }

  private drawPhase(g: Game): void {
    const ctx = this.ctx;
    switch (g.phase) {
      case 'intro':
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 90, W, 44);
        drawTextCentered(ctx, `ROUND ${g.roundIndex + 1}`, W / 2, 98, UI.gold, 2);
        drawTextCentered(ctx, g.stage.name, W / 2, 118, UI.text);
        break;
      case 'continue':
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 70, W, 80);
        drawTextCentered(ctx, 'CONTINUAR?', W / 2, 84, UI.gold, 2);
        drawTextCentered(ctx, String(Math.max(0, Math.ceil(g.continueT))), W / 2, 108, UI.text, 2);
        drawTextCentered(ctx, `CREDITOS ${g.continues} DE ${CONTINUES}  ATAQUE CONTINUA`, W / 2, 132, UI.dim);
        break;
      case 'clear':
        drawTextCentered(ctx, 'ROUND CONCLUIDO', W / 2, 100, UI.gold, 2);
        break;
      case 'ending':
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 50, W, 130);
        drawTextCentered(ctx, 'MR. X CAIU', W / 2, 62, UI.gold, 2);
        ['O SINDICATO ACABOU.', 'A CIDADE VOLTA A DORMIR', 'EM PAZ. ATE A PROXIMA NOITE.', '', `${g.heroFullName}: ${g.score} PONTOS`].forEach((l, i) => drawTextCentered(ctx, l, W / 2, 92 + i * 12, UI.text));
        if (g.phaseTime >= 6) drawTextCentered(ctx, 'ATAQUE CONTINUA', W / 2, 160, UI.dim);
        break;
      default: break;
    }
  }

  // ---------- screens ----------

  private drawMenu(g: Game): void {
    drawMenuScreen(this.ctx, W, H, {
      title: 'STREETS OF RAGE', titleColor: '#e05080', subtitle: 'AXEL, BLAZE E ADAM CONTRA O SINDICATO',
      labels: MENU_ITEMS.map((item) => item === 'HEROI' ? `HEROI: ${HERO_FULL_NAMES[g.heroId]}` : item === 'DIFICULDADE' ? `DIFICULDADE: ${g.difficultyName}` : g.shell.label(item)),
      selected: g.menuIndex, time: g.time, titleY: 24, itemsY: 66, itemGap: 11,
      footer: ['SETAS ANDAM  ESPACO ATACA  Z PULA  V POLICIA', 'SEGA 1991  EDICAO BROWSER'], footerY: 194,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'ATAQUE 3 VEZES: SOCO, SOCO E O CHUTE QUE DERRUBA',
      'TOQUE DUAS VEZES NA DIRECAO PARA CORRER',
      'CORRENDO + ATAQUE = CHUTE EM CORRIDA',
      'PULO + ATAQUE = VOADORA',
      'ANDE CONTRA O INIMIGO PARA AGARRAR',
      'AGARRADO: ATAQUE DA JOELHADAS  PULO ARREMESSA',
      'POLICIA: O CARRO CHEGA E O NAPALM DERRUBA TODOS',
      'UMA CHAMADA POR VIDA  O CARRINHO DA OUTRA',
      'CANO, TACO, FACA, GARRAFA: PASSE POR CIMA',
      'A ARMA CAI QUANDO VOCE E DERRUBADO',
      'MACA CURA UM TERCO  FRANGO CURA TUDO',
      `${STAGES.length} ROUNDS ATE O MR. X  3 VIDAS E 3 CREDITOS`,
    ], { y0: 46, gap: 11 });
  }

  private drawRanking(g: Game, menu: boolean): void {
    drawRankingScreen(this.ctx, W, H, [], menu, { shell: g.shell });
  }

  private drawGameOver(g: Game): void {
    drawGameOverScreen(this.ctx, W, H, {
      lines: [`PONTOS ${g.score}`, `ROUND ${g.roundIndex + 1}  ${g.stage.name}`, g.modeName],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }
}

// ---------- sprites ----------

/** Items of the cartridge: apple, roast chicken, money bag, gold bar, 1-UP. The rest use the engine's drawing. */
function drawSrItem(ctx: CanvasRenderingContext2D, it: Item, x: number, y: number): boolean {
  switch (it.kind) {
    case 'food':
      if (it.value >= HERO_HP) { // roast chicken on a plate
        ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x - 8, y - 3, 16, 3);
        ctx.fillStyle = '#d08040'; ctx.fillRect(x - 6, y - 9, 11, 7);
        ctx.fillStyle = '#f0b060'; ctx.fillRect(x - 5, y - 8, 6, 2);
        ctx.fillStyle = '#f8f0e0'; ctx.fillRect(x + 5, y - 11, 3, 4);
      } else { // apple
        ctx.fillStyle = '#e03030'; ctx.fillRect(x - 4, y - 8, 8, 7);
        ctx.fillStyle = '#ff8080'; ctx.fillRect(x - 3, y - 7, 2, 2);
        ctx.fillStyle = '#40a040'; ctx.fillRect(x, y - 10, 2, 3);
      }
      return true;
    case 'points':
      if (it.value >= 5000) { // gold bar
        ctx.fillStyle = '#f0d040'; ctx.fillRect(x - 7, y - 6, 14, 6);
        ctx.fillStyle = '#fff0a0'; ctx.fillRect(x - 6, y - 5, 12, 1);
        ctx.fillStyle = '#b09020'; ctx.fillRect(x - 7, y - 2, 14, 2);
      } else { // money bag
        ctx.fillStyle = '#c8a040'; ctx.fillRect(x - 5, y - 8, 10, 8);
        ctx.fillStyle = '#806020'; ctx.fillRect(x - 3, y - 10, 6, 2); ctx.fillRect(x - 1, y - 6, 2, 4);
      }
      return true;
    case 'life': // 1-UP token
      ctx.fillStyle = '#e05080'; ctx.fillRect(x - 7, y - 9, 14, 9);
      drawText(ctx, '1UP', x - 6, y - 8, '#ffffff');
      return true;
    default: return false;
  }
}

/** Knives spin, the boomerang turns, the flame flickers, bullets streak. */
function drawSrProjectile(ctx: CanvasRenderingContext2D, p: Projectile, x: number, y: number): boolean {
  const zy = y - Math.round(p.z);
  const c = PROJECTILE_COLOURS[p.kind];
  if (!c) return false;
  switch (p.kind) {
    case 'knife': {
      const a = p.t * 18;
      ctx.fillStyle = c;
      for (let i = -4; i <= 4; i += 2) ctx.fillRect(Math.round(x + Math.cos(a) * i), Math.round(zy + Math.sin(a) * i * 0.5), 2, 2);
      return true;
    }
    case 'boomerang': {
      const a = p.t * 14;
      ctx.fillStyle = c;
      for (let i = 0; i <= 6; i += 2) { ctx.fillRect(Math.round(x + Math.cos(a) * i), Math.round(zy + Math.sin(a) * i), 3, 3); ctx.fillRect(Math.round(x + Math.cos(a + Math.PI / 2) * i), Math.round(zy + Math.sin(a + Math.PI / 2) * i), 3, 3); }
      return true;
    }
    case 'flame': {
      const f = Math.floor(p.t * 20) % 3;
      ctx.fillStyle = '#ff6020'; ctx.fillRect(x - 8, zy - 6 + f, 16, 12 - f);
      ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 5, zy - 3 + f, 10, 6 - f);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, zy - 1, 4, 2);
      return true;
    }
    case 'bullet':
      ctx.fillStyle = c; ctx.fillRect(x - 3, zy - 1, 6, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, zy - 1, 2, 2);
      return true;
    default: return false;
  }
}

function mix(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
