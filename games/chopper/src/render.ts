import {
  W, H, HUD_H, HORIZON_Y, GROUND_Y, SCANNER_Y, SCANNER_H, WORLD_W, CHOPPER_W, TRUCK_H, TRUCK_BONUS, EXTRA_EVERY, MAX_CHOPPERS,
  POINTS, ENEMIES_PER_WAVE, TRUCKS, deltaX, wrapX,
} from './config';
import { Game, MENU_ITEMS } from './game';
import { Field, enemyRect } from './field';
import { sprite } from './sprites';
import {
  drawText, drawTextCentered, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen, drawGameOverScreen,
  drawInitialsScreen,
} from '@arcade/shared';

const C = {
  sky: '#78b8f0', mountain: '#b08048', mountainDark: '#80582c', sand: '#e8c878', sandLine: '#c8a050',
  scanner: '#101010', scanFrame: '#404040', blip: '#f0f0f0', me: '#000000',
  text: '#dfe6ee', dim: '#8a97a6', gold: '#ffe14a', red: '#ff4a4a', bullet: '#ffffff',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demo = new Field(1, 'cadet', 2, 100);
  private demoCam = 0;

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
      this.demoCam = wrapX(this.demoCam + 0.5);
      this.demo.update(1 / 60, { x: this.demoCam + 100, y: 90, alive: false });
      this.drawWorld(this.demo, this.demoCam, g.time);
      ctx.drawImage(sprite(`chopper${Math.floor(g.time * 20) & 1}`), 100, 90);
      ctx.fillStyle = 'rgba(0,0,0,0.66)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    this.drawWorld(g.field, g.camera, g.time);
    this.drawChopper(g);
    this.drawScanner(g);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- the desert ----------

  private sx(worldX: number, camera: number): number {
    return deltaX(camera, worldX);
  }

  private drawWorld(field: Field, camera: number, time: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.sky;
    ctx.fillRect(0, HUD_H, W, GROUND_Y - HUD_H);
    // mountains scroll with the world (parallax half speed)
    ctx.fillStyle = C.mountain;
    for (let i = 0; i < 40; i++) {
      const mx = i * 64;
      const x = ((mx - camera * 0.5) % (WORLD_W * 0.5) + WORLD_W * 0.5) % (WORLD_W * 0.5);
      if (x > W + 40) continue;
      const h = 14 + ((i * 37) % 18);
      ctx.fillStyle = i % 2 ? C.mountain : C.mountainDark;
      for (let k = 0; k < h; k++) ctx.fillRect(Math.round(x - (h - k) * 1.3), HORIZON_Y - k, Math.round((h - k) * 2.6), 1);
    }
    ctx.fillStyle = C.sand;
    ctx.fillRect(0, HORIZON_Y, W, GROUND_Y + 10 - HORIZON_Y);
    ctx.fillStyle = C.sandLine;
    ctx.fillRect(0, GROUND_Y, W, 1);
    for (let i = 0; i < 30; i++) {
      const x = ((i * 53 - camera) % WORLD_W + WORLD_W) % WORLD_W;
      if (x < W) ctx.fillRect(Math.round(x), GROUND_Y + 3 + (i % 5), 6, 1);
    }

    // trucks
    for (const t of field.trucks) {
      const x = this.sx(t.x, camera);
      if (x < -20 || x > W) continue;
      ctx.drawImage(sprite(t.alive ? 'truck' : 'truckDead'), Math.round(x), GROUND_Y - TRUCK_H);
    }
    // enemies
    for (const e of field.enemies) {
      if (!e.alive) continue;
      const r = enemyRect(e);
      const x = this.sx(r.x, camera);
      if (x < -24 || x > W) continue;
      const name = e.kind === 'jet' ? 'jet' : `heli${Math.floor(time * 20 + e.phase) & 1}`;
      ctx.drawImage(sprite(name, e.dir > 0), Math.round(x), Math.round(r.y));
    }
    // missiles and bullets
    for (const m of field.missiles) {
      const x = this.sx(m.x, camera);
      if (x < -4 || x > W) continue;
      ctx.drawImage(sprite('missile', m.vx > 0), Math.round(x), Math.round(m.y));
    }
    ctx.fillStyle = C.bullet;
    for (const b of field.bullets) {
      const x = this.sx(b.x, camera);
      if (x < -4 || x > W) continue;
      ctx.fillRect(Math.round(x), Math.round(b.y), 4, 1);
    }
  }

  private drawChopper(g: Game): void {
    const ctx = this.ctx;
    const c = g.chopper;
    const x = this.sx(c.x, g.camera);
    if (!c.alive) {
      if (Math.floor(g.phaseTime * 10) % 2 === 0) return;
      ctx.fillStyle = C.red;
      const k = Math.min(1, g.phaseTime / 1.2);
      ctx.fillRect(Math.round(x) + 4, Math.round(c.y + k * (GROUND_Y - c.y - 6)), 16, 6);
      return;
    }
    ctx.drawImage(sprite(`chopper${Math.floor(g.time * 20) & 1}`, c.facing < 0), Math.round(x), Math.round(c.y));
  }

  // ---------- long-range scanner ----------

  private drawScanner(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.scanFrame;
    ctx.fillRect(28, SCANNER_Y - 2, W - 56, SCANNER_H + 4);
    ctx.fillStyle = C.scanner;
    ctx.fillRect(30, SCANNER_Y, W - 60, SCANNER_H);
    const left = wrapX(g.chopper.x - WORLD_W / 2);
    const px = (wx: number) => 30 + (wrapX(wx - left) / WORLD_W) * (W - 60);
    const py = (y: number) => SCANNER_Y + 2 + ((y - HUD_H) / (GROUND_Y - HUD_H)) * (SCANNER_H - 6);
    ctx.fillStyle = C.blip;
    for (const t of g.field.trucks) if (t.alive) ctx.fillRect(Math.round(px(t.x)), SCANNER_Y + SCANNER_H - 4, 2, 2);
    for (const e of g.field.enemies) if (e.alive) ctx.fillRect(Math.round(px(e.x)), Math.round(py(e.y)), 2, 2);
    // the screen's one mile
    ctx.fillStyle = '#303030';
    const sx0 = px(g.camera);
    ctx.fillRect(Math.round(sx0), SCANNER_Y, 1, SCANNER_H);
    ctx.fillRect(Math.round(sx0 + (W / WORLD_W) * (W - 60)), SCANNER_Y, 1, SCANNER_H);
    ctx.fillStyle = C.me;
    ctx.fillRect(Math.round(px(g.chopper.x)) - 1, Math.round(py(g.chopper.y)) - 1, 3, 3);
    ctx.fillStyle = C.blip;
    ctx.fillRect(Math.round(px(g.chopper.x)), Math.round(py(g.chopper.y)), 1, 1);
  }

  // ---------- HUD ----------

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, HUD_H);
    drawText(ctx, String(g.score).padStart(6, '0'), 8, 3, C.text, 2);
    for (let i = 0; i < g.reserve; i++) ctx.drawImage(sprite('life'), 100 + i * 14, 6);
    drawText(ctx, `ONDA ${g.wave}`, 200, 3, C.dim);
    drawText(ctx, `CAMINHOES ${g.field.trucksAlive}  INIMIGOS ${g.field.enemiesAlive}`, 200, 11, C.dim);
    if (g.phase === 'ready') drawTextCentered(ctx, g.afterLoss ? 'APERTE PARA CONTINUAR' : 'MOVA OU ATIRE PARA COMECAR', W / 2, 60, C.gold);
    if (g.phase === 'bonus') {
      drawTextCentered(ctx, 'ONDA LIMPA', W / 2, 56, C.gold, 2);
      drawTextCentered(ctx, `${g.field.trucksAlive} CAMINHOES X ${Math.min(10, g.wave)} X ${TRUCK_BONUS} = ${g.lastBonus}`, W / 2, 76, C.text);
    }
  }

  // ---------- screens (shared look, game-specific words) ----------

  private drawMenu(g: Game): void {
    drawMenuScreen(this.ctx, W, H, {
      title: 'CHOPPER COMMAND', titleColor: '#78b8f0', titleY: 30, subtitle: 'PROTEJA O COMBOIO DE CAMINHOES NO DESERTO',
      labels: MENU_ITEMS.map((item) => {
        if (item === 'JOGO') return `JOGO: ${g.level === 'cadet' ? 'CADETE (1)' : 'COMANDANTE (3)'}`;
        if (item === 'DIFICULDADE') return `DIFICULDADE: ${g.difficulty === 'B' ? 'B (TIRO RAPIDO)' : 'A (TIRO LENTO)'}`;
        return g.shell.label(item);
      }),
      selected: g.menuIndex, time: g.time, itemsY: 74,
      footer: ['SETAS VOAM  ESPACO ATIRA', 'ACTIVISION 1982  EDICAO BROWSER'], footerY: 190,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      `CADA ONDA: ${ENEMIES_PER_WAVE} INIMIGOS E ${TRUCKS} CAMINHOES`,
      `HELICOPTERO ${POINTS.heli}  JATO ${POINTS.jet}`,
      'MISSEIS INIMIGOS SE DIVIDEM EM DOIS',
      'NAO DA PARA ABATE-LOS: DESVIE',
      'PILOTOS KAMIKAZE COLIDEM COM VOCE',
      'BATER NO COMBOIO DESTROI UM CAMINHAO',
      `ONDA LIMPA: CAMINHOES X ONDA X ${TRUCK_BONUS}`,
      'DEZ ONDAS, CADA UMA MAIS RAPIDA',
      'O SCANNER MOSTRA 5 MILHAS, A TELA 1',
      `HELICOPTERO EXTRA A CADA ${EXTRA_EVERY} (MAX ${MAX_CHOPPERS})`,
      'MUNICAO ILIMITADA',
    ], { gap: 12 });
  }

  private drawRanking(g: Game, menu: boolean): void {
    const rows = g.highScores.map((h, i) => {
      const mode = h.mode ? `  ${h.mode.replace('COMANDANTE', 'CMDTE')}` : '';
      return `${String(i + 1).padStart(2, ' ')}  ${h.initials.padEnd(3, ' ')}  ${String(h.score).padStart(6, ' ')}  ONDA ${String(h.wave).padStart(2, ' ')}${mode}`;
    });
    drawRankingScreen(this.ctx, W, H, rows, menu, { shell: g.shell });
  }

  private drawPaused(g: Game): void {
    drawPausedScreen(this.ctx, W, H, g.pauseIndex);
  }

  private drawGameOver(g: Game): void {
    drawGameOverScreen(this.ctx, W, H, {
      lines: [`PONTOS ${g.score}`, `ONDA ${g.wave}  ${g.modeName}`],
      highlight: g.score >= 10000 && g.level === 'cadet' ? 'VOCE ENTROU PARA OS COMMANDOS' : undefined,
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }

  private drawInitials(g: Game): void {
    drawInitialsScreen(this.ctx, W, H, `${g.score} PONTOS`, g.initials, g.initialsPos, g.time);
  }
}

export { CHOPPER_W };
