import { W, H, HUD_H, FIELD_TOP, FIELD_H, START_SHIPS, SHIELD_MAX } from './config';
import { Game, MENU_ITEMS } from './game';
import { Field } from './field';
import { GAME_NUMBERS, gameSpec, SPECIAL_NAMES } from './games';
import { rock, saucer, ship } from './sprites';
import {
  drawText, textWidth, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen,
  drawInitialsScreen,
} from '@arcade/shared';

// The cartridge colours each asteroid by its vertical position: bands of hue down the screen.
const BANDS = ['#d8a0ff', '#80c8ff', '#80ffb0', '#f8f080', '#ffb060', '#ff8090', '#c0a0ff', '#90e0e0'];
const C = { text: '#dfe6ee', dim: '#8a97a6', gold: '#ffe14a', red: '#ff4a4a', green: '#3ddc84', ship: '#f0f0f0', shot: '#ffffff', enemyShot: '#ff8080', satellite: '#ff9040', ufo: '#60ff80' };

function bandColor(y: number): string {
  return BANDS[Math.floor(((y - FIELD_TOP) / FIELD_H) * BANDS.length) % BANDS.length];
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demo = new Field(5, false);

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.demo.spawnWave(8);
  }

  draw(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (g.state === 'menu' || g.state === 'howto' || g.state === 'ranking') {
      this.demo.update(1 / 60, null);
      this.drawField(this.demo);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    this.drawField(g.field);
    this.drawShip(g);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  private drawField(f: Field): void {
    const ctx = this.ctx;
    for (const a of f.asteroids) {
      const s = rock(a.size, a.shape, bandColor(a.y));
      this.wrapped(s, a.x - s.width / 2, a.y - s.height / 2);
    }
    if (f.saucer) {
      const u = f.saucer;
      const s = saucer(u.kind, u.kind === 'satellite' ? C.satellite : C.ufo);
      ctx.drawImage(s, Math.round(u.x - s.width / 2), Math.round(u.y - s.height / 2));
    }
    for (const sh of f.shots) {
      ctx.fillStyle = sh.enemy ? C.enemyShot : C.shot;
      ctx.fillRect(Math.round(sh.x) - 1, Math.round(sh.y) - 1, 2, 2);
    }
    for (const d of f.debris) {
      ctx.fillStyle = d.color;
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2);
    }
  }

  /** Draws a sprite and its copies across the wrapped edges. */
  private wrapped(s: HTMLCanvasElement, x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, FIELD_TOP, W, FIELD_H);
    ctx.clip();
    for (const dx of [-W, 0, W]) for (const dy of [-FIELD_H, 0, FIELD_H]) {
      const px = Math.round(x + dx);
      const py = Math.round(y + dy);
      if (px + s.width < 0 || px > W || py + s.height < FIELD_TOP || py > H) continue;
      ctx.drawImage(s, px, py);
    }
    ctx.restore();
  }

  private drawShip(g: Game): void {
    const s = g.ship;
    if (s.mode === 'dead' || s.mode === 'hyper') return;
    if (s.mode === 'waiting') return;
    const flame = s.thrusting && Math.floor(g.time * 20) % 2 === 0;
    const spr = ship(s.dir, C.ship, flame);
    this.wrapped(spr, s.x - spr.width / 2, s.y - spr.height / 2);
    if (s.shieldOn) {
      const ctx = this.ctx;
      const k = s.shieldT / SHIELD_MAX;
      ctx.fillStyle = k > 0.75 && Math.floor(g.time * 10) % 2 === 0 ? C.red : '#60a0ff';
      const r = 11;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ctx.fillRect(Math.round(s.x + Math.cos(a) * r) - 1, Math.round(s.y + Math.sin(a) * r) - 1, 2, 2);
      }
    }
  }

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, HUD_H);
    drawText(ctx, String(g.score).padStart(6, '0'), 8, 4, C.text, 2);
    for (let i = 0; i < Math.max(0, g.ships - 1); i++) ctx.drawImage(ship(0, C.ship), 120 + i * 14, 2);
    drawText(ctx, `J${g.gameNumber} ${g.difficulty}`, W - 8 - textWidth(`J${g.gameNumber} ${g.difficulty}`), 4, C.dim);
    drawText(ctx, `ONDA ${g.wave}`, W - 8 - textWidth(`ONDA ${g.wave}`), 12, C.dim);
  }

  // ---------- screens (shared look, game-specific words) ----------

  private drawMenu(g: Game): void {
    const spec = gameSpec(GAME_NUMBERS[g.gameIndex]);
    const labels = MENU_ITEMS.map((item) => {
      if (item === 'JOGO') {
        const bonus = spec.bonus ? `VIDA A CADA ${spec.bonus}` : 'SEM VIDA EXTRA';
        return spec.kids ? `JOGO ${spec.number}: CRIANCAS` : `JOGO ${spec.number}: ${SPECIAL_NAMES[spec.special]} ${spec.fast ? 'RAPIDO' : 'LENTO'}, ${bonus}`;
      }
      if (item === 'DIFICULDADE') return `DIFICULDADE: ${g.difficulty === 'A' ? 'A (COM OVNIS)' : 'B (SEM OVNIS)'}`;
      return g.shell.label(item);
    });
    drawMenuScreen(this.ctx, W, H, {
      title: 'ASTEROIDS', titleColor: '#d8a0ff', titleY: 30, subtitle: 'VERSAO ATARI 2600',
      labels, selected: g.menuIndex, time: g.time, itemsY: 76,
      footer: ['ESQ DIR GIRAM  CIMA PROPULSAO  BAIXO ESPECIAL', 'ATARI 1981  EDICAO BROWSER'], footerY: 190,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'GIRE A NAVE E ATIRE NAS PEDRAS',
      'GRANDE 20  MEDIA 50  PEQUENA 100',
      'GRANDE VIRA DUAS MEDIAS, MEDIA VIRA DUAS PEQUENAS',
      'CIMA: PROPULSAO (A NAVE DESLIZA)',
      'BAIXO: HIPERESPACO, ESCUDO OU FLIP CONFORME O JOGO',
      'ESCUDO POR MAIS DE 2 SEGUNDOS EXPLODE A NAVE',
      'DIFICULDADE A: SATELITE 200 E OVNI 1000',
      'OVNIS SO DEPOIS DE 7500 PONTOS',
      'QUATRO NAVES; VIDA EXTRA CONFORME O JOGO',
      'JOGOS 1-32 DO MANUAL E 65 PARA CRIANCAS',
    ]);
  }

  private drawRanking(g: Game, menu: boolean): void {
    const rows = g.highScores.map((h, i) => `${String(i + 1).padStart(2, ' ')}  ${h.initials.padEnd(3, ' ')}  ${String(h.score).padStart(6, ' ')}  ONDA ${String(h.level).padStart(2, ' ')}  ${h.mode.padEnd(5, ' ')}`);
    drawRankingScreen(this.ctx, W, H, rows, menu, { shell: g.shell });
  }

  private drawPaused(g: Game): void {
    drawPausedScreen(this.ctx, W, H, g.pauseIndex);
  }

  private drawGameOver(g: Game): void {
    drawGameOverScreen(this.ctx, W, H, {
      lines: [`PONTOS ${g.score}`, `ONDA ${g.wave}  JOGO ${g.gameNumber}  DIFICULDADE ${g.difficulty}`, `NAVES NO INICIO ${START_SHIPS}`],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }

  private drawInitials(g: Game): void {
    drawInitialsScreen(this.ctx, W, H, `${g.score} PONTOS`, g.initials, g.initialsPos, g.time);
  }
}
