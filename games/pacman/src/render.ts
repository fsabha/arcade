import { W, H, TILE, COLS, ROWS, MAZE_Y, FRUIT_POS, POINTS } from './config';
import { Maze, MAP, tileCenter } from './maze';
import { Game, Ghost, MENU_ITEMS } from './game';
import { fruitSprite, ghostSprite, drawPac, pacSprite, GHOST_COLORS } from './sprites';
import {
  drawText, drawTextCentered, textWidth, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen,
  drawInitialsScreen,
} from '@arcade/shared';
import { GHOSTS, GhostName } from './ghostai';

const C = {
  wall: '#2121de',
  wallFlash: '#ffffff',
  door: '#ffb8de',
  dot: '#ffb8ae',
  text: '#dedede',
  dim: '#8a8a8a',
  red: '#ff0000',
  yellow: '#ffff00',
  cyan: '#00ffff',
  pink: '#ffb8ff',
  peach: '#ffb8ae',
};

const NAMES: Record<GhostName, [string, string]> = {
  blinky: ['SHADOW', '"BLINKY"'],
  pinky: ['SPEEDY', '"PINKY"'],
  inky: ['BASHFUL', '"INKY"'],
  clyde: ['POKEY', '"CLYDE"'],
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private wallsBlue: HTMLCanvasElement;
  private wallsWhite: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.wallsBlue = this.buildWalls(C.wall);
    this.wallsWhite = this.buildWalls(C.wallFlash);
  }

  // ---------- maze walls (built once) ----------

  private buildWalls(color: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = ROWS * TILE;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = color;
    const wall = (x: number, y: number) => Maze.cell(x, y) === '#';
    // Outer walls: wall tiles connected to the map border (for the double line)
    const outer = new Uint8Array(COLS * ROWS);
    const stack: [number, number][] = [];
    for (let r = 0; r < ROWS; r++) for (let x = 0; x < COLS; x++) {
      if ((r === 0 || r === ROWS - 1 || x === 0 || x === COLS - 1) && wall(x, r)) { outer[r * COLS + x] = 1; stack.push([x, r]); }
    }
    while (stack.length) {
      const [x, r] = stack.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = r + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || !wall(nx, ny) || outer[ny * COLS + nx]) continue;
        outer[ny * COLS + nx] = 1;
        stack.push([nx, ny]);
      }
    }
    const px = (x: number, y: number) => ctx.fillRect(x, y, 1, 1);

    for (let r = 0; r < ROWS; r++) {
      for (let x = 0; x < COLS; x++) {
        if (!wall(x, r)) continue;
        const x0 = x * TILE, y0 = r * TILE;
        const N = !wall(x, r - 1), S = !wall(x, r + 1), Wt = !wall(x - 1, r), E = !wall(x + 1, r);
        const NW = !wall(x - 1, r - 1), NE = !wall(x + 1, r - 1), SW = !wall(x - 1, r + 1), SE = !wall(x + 1, r + 1);
        // inner line (inset 3), chamfered at convex corners
        if (N) for (let i = (Wt ? 5 : 0); i <= (E ? 2 : 7); i++) px(x0 + i, y0 + 3);
        if (S) for (let i = (Wt ? 5 : 0); i <= (E ? 2 : 7); i++) px(x0 + i, y0 + 4);
        if (Wt) for (let i = (N ? 5 : 0); i <= (S ? 2 : 7); i++) px(x0 + 3, y0 + i);
        if (E) for (let i = (N ? 5 : 0); i <= (S ? 2 : 7); i++) px(x0 + 4, y0 + i);
        if (N && Wt) px(x0 + 4, y0 + 4);
        if (N && E) px(x0 + 3, y0 + 4);
        if (S && Wt) px(x0 + 4, y0 + 3);
        if (S && E) px(x0 + 3, y0 + 3);
        // concave corners: connect the neighbours' lines around a diagonal open tile
        if (!N && !Wt && NW) { px(x0 + 3, y0); px(x0 + 3, y0 + 1); px(x0 + 2, y0 + 2); px(x0 + 1, y0 + 3); px(x0, y0 + 3); }
        if (!N && !E && NE) { px(x0 + 4, y0); px(x0 + 4, y0 + 1); px(x0 + 5, y0 + 2); px(x0 + 6, y0 + 3); px(x0 + 7, y0 + 3); }
        if (!S && !Wt && SW) { px(x0 + 3, y0 + 7); px(x0 + 3, y0 + 6); px(x0 + 2, y0 + 5); px(x0 + 1, y0 + 4); px(x0, y0 + 4); }
        if (!S && !E && SE) { px(x0 + 4, y0 + 7); px(x0 + 4, y0 + 6); px(x0 + 5, y0 + 5); px(x0 + 6, y0 + 4); px(x0 + 7, y0 + 4); }
        // outer double line along the screen border
        if (outer[r * COLS + x]) {
          const top = r === 0, bot = r === ROWS - 1, lef = x === 0, rig = x === COLS - 1;
          if (top) for (let i = (lef ? 2 : 0); i <= (rig ? 5 : 7); i++) px(x0 + i, y0);
          if (bot) for (let i = (lef ? 2 : 0); i <= (rig ? 5 : 7); i++) px(x0 + i, y0 + 7);
          if (lef) for (let i = (top ? 2 : 0); i <= (bot ? 5 : 7); i++) px(x0, y0 + i);
          if (rig) for (let i = (top ? 2 : 0); i <= (bot ? 5 : 7); i++) px(x0 + 7, y0 + i);
          if (top && lef) px(x0 + 1, y0 + 1);
          if (top && rig) px(x0 + 6, y0 + 1);
          if (bot && lef) px(x0 + 1, y0 + 6);
          if (bot && rig) px(x0 + 6, y0 + 6);
          // tunnel mouths: join the outer line to the inner line
          if (lef && S && !wall(x, r + 1) && Maze.cell(x, r + 1) === '~') for (let i = 0; i <= 3; i++) px(x0 + i, y0 + 4);
          if (lef && N && Maze.cell(x, r - 1) === '~') for (let i = 0; i <= 3; i++) px(x0 + i, y0 + 3);
          if (rig && S && Maze.cell(x, r + 1) === '~') for (let i = 4; i <= 7; i++) px(x0 + i, y0 + 4);
          if (rig && N && Maze.cell(x, r - 1) === '~') for (let i = 4; i <= 7; i++) px(x0 + i, y0 + 3);
        }
      }
    }
    // ghost house door
    ctx.fillStyle = C.door;
    for (let r = 0; r < ROWS; r++) for (let x = 0; x < COLS; x++) if (MAP[r][x] === '-') ctx.fillRect(x * TILE, r * TILE + 3, TILE, 2);
    return c;
  }

  // ---------- frame ----------

  draw(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (g.state === 'menu' || g.state === 'howto' || g.state === 'ranking') {
      this.drawHeader(g);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }
    if (g.phase === 'intermission') {
      this.drawHeader(g);
      this.drawIntermission(g);
      return;
    }

    this.drawHeader(g);
    const flash = g.phase === 'levelclear' && g.phaseTime > 0.6 && Math.floor((g.phaseTime - 0.6) / 0.25) % 2 === 1;
    ctx.drawImage(flash ? this.wallsWhite : this.wallsBlue, 0, MAZE_Y);
    this.drawDots(g);
    this.drawFooter(g);

    if (g.phase === 'ready') {
      if (g.firstReady && g.phaseTime < 2.2) drawTextCentered(ctx, 'PLAYER ONE', W / 2, MAZE_Y + 11 * TILE + 1, C.cyan, 1);
      drawTextCentered(ctx, 'READY!', W / 2, MAZE_Y + 17 * TILE + 1, C.yellow, 1);
    }

    if (g.fruit) ctx.drawImage(fruitSprite(g.fruit.kind), tileCenter(FRUIT_POS.x) - 6, MAZE_Y + tileCenter(FRUIT_POS.y) - 6);
    if (g.fruitScoreT > 0) drawTextCentered(ctx, String(g.fruitScore), tileCenter(FRUIT_POS.x), MAZE_Y + tileCenter(FRUIT_POS.y) - 2, C.pink, 1);

    if (g.phase !== 'levelclear' || g.phaseTime < 0.6) {
      for (const gh of g.ghosts) this.drawGhost(g, gh);
    }
    this.drawPacman(g);

    if (g.phase === 'ghosteat' && g.eatenGhost) {
      drawTextCentered(ctx, String(g.eatenPoints), g.eatenGhost.x, MAZE_Y + g.eatenGhost.y - 2, C.cyan, 1);
    }
    if (g.state === 'gameover') drawTextCentered(ctx, 'GAME  OVER', W / 2, MAZE_Y + 17 * TILE + 1, C.red, 1);
    if (g.state === 'gameover' && g.stateTime >= 2.5 && Math.floor(g.time * 2) % 2 === 0) {
      drawTextCentered(ctx, g.qualifiesForRank ? 'NOVO RECORDE! ENTER' : 'ENTER OU OK: MENU', W / 2, MAZE_Y + 20 * TILE + 1, C.text, 1);
    }
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  private drawHeader(g: Game): void {
    const ctx = this.ctx;
    if (Math.floor(g.time * 4) % 2 === 0 || g.state === 'menu') drawText(ctx, '1UP', 24, 1, C.text, 1);
    drawTextCentered(ctx, 'HIGH SCORE', W / 2, 1, C.text, 1);
    const score = g.state === 'menu' || g.state === 'howto' || g.state === 'ranking' ? 0 : g.score;
    const s = String(score).padStart(2, ' ');
    drawText(ctx, s, 52 - textWidth(s), 9, C.text, 1);
    const hs = String(g.highScore);
    drawText(ctx, hs, W / 2 + 20 - textWidth(hs), 9, C.text, 1);
  }

  private drawDots(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.dot;
    const pelletOn = Math.floor(g.time * 5) % 2 === 0 || g.state !== 'playing' || g.phase !== 'playing';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = g.maze.dotAt(c, r);
        if (v === 1) ctx.fillRect(c * TILE + 3, MAZE_Y + r * TILE + 3, 2, 2);
        else if (v === 2 && pelletOn) {
          const x = c * TILE, y = MAZE_Y + r * TILE;
          ctx.fillRect(x + 1, y + 2, 6, 4);
          ctx.fillRect(x + 2, y + 1, 4, 6);
        }
      }
    }
  }

  private drawFooter(g: Game): void {
    const ctx = this.ctx;
    const y = MAZE_Y + ROWS * TILE + 8;
    const lives = g.state === 'menu' ? 0 : Math.max(0, g.lives - 1);
    for (let i = 0; i < Math.min(5, lives); i++) drawPac(ctx, 24 + i * 16, y, 'left', 0.5);
    const fruits = g.fruitsCollected.slice(-7);
    fruits.forEach((f, i) => ctx.drawImage(fruitSprite(f), W - 24 - i * 16 - 6, y - 6));
  }

  private drawGhost(g: Game, gh: Ghost): void {
    if (g.phase === 'dying' && g.phaseTime > 0.5) return;
    if (g.phase === 'ghosteat' && gh === g.eatenGhost) return;
    const frame = (Math.floor(g.time * 8) % 2) as 0 | 1;
    let look: 'normal' | 'fright' | 'flash' | 'eyes' = 'normal';
    if (gh.state === 'eyes' || gh.state === 'entering') look = 'eyes';
    else if (gh.state === 'frightened') look = g.frightFlashing && Math.floor(g.time / 0.14) % 2 === 0 ? 'flash' : 'fright';
    const spr = ghostSprite(gh.name, frame, gh.dir, look);
    this.ctx.drawImage(spr, Math.round(gh.x - 7), Math.round(MAZE_Y + gh.y - 7));
  }

  private drawPacman(g: Game): void {
    const ctx = this.ctx;
    if (g.phase === 'ghosteat' || g.state === 'gameover') return;
    const p = g.pac;
    const cx = Math.round(p.x), cy = Math.round(MAZE_Y + p.y);
    if (g.phase === 'dying') {
      const t = g.phaseTime;
      if (t < 0.5) { drawPac(ctx, cx, cy, p.dir, 0.5); return; }
      const k = Math.min(1, (t - 0.5) / 1.2);
      if (k < 1) {
        // mouth opens from the top until the body vanishes (quantized like the arcade frames)
        const q = Math.floor(k * 12) / 12;
        const s = pacSprite('up', q, 6.5, Math.PI);
        ctx.drawImage(s, cx - 6, cy - 6);
      } else if (t < 2.1) {
        ctx.fillStyle = C.yellow;
        const r = 3 + (t - 1.7) * 10;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          ctx.fillRect(Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 1, 2, 2);
        }
      }
      return;
    }
    if (g.phase === 'levelclear' || g.phase === 'ready') { drawPac(ctx, cx, cy, p.dir, 0); return; }
    const phase = g.pacMoving ? g.pacAnim : 0;
    const open = phase < 0.25 ? phase * 4 : phase < 0.5 ? (0.5 - phase) * 4 : phase < 0.75 ? (phase - 0.5) * 4 : (1 - phase) * 4;
    drawPac(ctx, cx, cy, p.dir, Math.max(0.05, open));
  }

  // ---------- attract / menus ----------

  private drawMenu(g: Game): void {
    const ctx = this.ctx;
    const t = g.time % 14;
    drawTextCentered(ctx, 'CHARACTER / NICKNAME', W / 2 + 8, MAZE_Y + 2 * TILE, C.text, 1);
    GHOSTS.forEach((name, i) => {
      const y = MAZE_Y + (4 + i * 3) * TILE;
      const show = t > 1 + i * 1.6;
      if (!show) return;
      ctx.drawImage(ghostSprite(name, (Math.floor(g.time * 8) % 2) as 0 | 1, 'right', 'normal'), 24, y - 3);
      if (t > 1.6 + i * 1.6) drawText(ctx, `-${NAMES[name][0]}`, 48, y + 1, GHOST_COLORS[name], 1);
      if (t > 2.2 + i * 1.6) drawText(ctx, NAMES[name][1], 112, y + 1, GHOST_COLORS[name], 1);
    });
    if (t > 8) {
      ctx.fillStyle = C.dot;
      ctx.fillRect(74, MAZE_Y + 17 * TILE + 3, 2, 2);
      drawText(ctx, `${POINTS.dot} PTS`, 84, MAZE_Y + 17 * TILE + 1, C.text, 1);
      if (Math.floor(g.time * 5) % 2 === 0) { ctx.fillRect(72, MAZE_Y + 19 * TILE + 2, 6, 4); ctx.fillRect(73, MAZE_Y + 19 * TILE + 1, 4, 6); }
      drawText(ctx, `${POINTS.pellet} PTS`, 84, MAZE_Y + 19 * TILE + 1, C.text, 1);
    }

    // the item list and footer share the arcade-wide look; the title line is the attract screen above
    drawMenuScreen(ctx, W, H, {
      title: '', titleColor: C.yellow,
      labels: MENU_ITEMS.map((item) => g.shell.label(item)),
      selected: g.menuIndex, time: g.time, itemsY: MAZE_Y + 22 * TILE, itemGap: 10,
      footer: ['HOMENAGEM AO ARCADE DE 1980'], footerY: H - 14,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'COMA TODAS AS PASTILHAS DO',
      'LABIRINTO PARA PASSAR DE FASE.',
      '',
      'FANTASMAS MATAM AO TOCAR.',
      'A PASTILHA GRANDE DEIXA OS',
      'FANTASMAS AZUIS: COMA-OS POR',
      '200, 400, 800 E 1600 PONTOS.',
      '',
      'FRUTAS APARECEM DUAS VEZES',
      'POR FASE EMBAIXO DA CASA.',
      '',
      'O TUNEL LATERAL ATRAVESSA A',
      'TELA. FANTASMAS FICAM LENTOS',
      'NELE.',
      '',
      'VIDA EXTRA AOS 10000 PONTOS.',
      'A CADA FASE TUDO FICA MAIS',
      'RAPIDO E O TEMPO AZUL MENOR.',
      '',
      'SETAS OU WASD MOVEM. P PAUSA.',
    ], { y0: MAZE_Y + 32, gap: 9 });
  }

  private drawRanking(g: Game, menu: boolean): void {
    const rows = g.highScores.map((h, i) => `${String(i + 1).padStart(2, ' ')}.  ${h.initials.padEnd(3, ' ')}  ${String(h.score).padStart(6, '0')}  FASE ${String(h.level).padStart(2, '0')}`);
    drawRankingScreen(this.ctx, W, H, rows, menu, { y0: MAZE_Y + 50, shell: g.shell });
  }

  private drawPaused(g: Game): void {
    drawPausedScreen(this.ctx, W, H, g.pauseIndex);
  }

  private drawInitials(g: Game): void {
    drawInitialsScreen(this.ctx, W, H, `PONTOS ${g.score}`, g.initials, g.initialsPos, g.time);
  }

  // ---------- intermissions (coffee breaks) ----------

  private drawIntermission(g: Game): void {
    const ctx = this.ctx;
    const t = g.phaseTime;
    const y = MAZE_Y + 17 * TILE;
    const frame = (Math.floor(g.time * 8) % 2) as 0 | 1;
    const mouth = Math.abs(Math.sin(g.time * 12));
    if (g.intermission === 1) {
      if (t < 4.2) {
        // Blinky chases Pac-Man to the left
        const px = W + 20 - t * 70;
        drawPac(ctx, px, y, 'left', mouth);
        ctx.drawImage(ghostSprite('blinky', frame, 'left', 'normal'), Math.round(px + 40 - 7), y - 7);
      } else {
        // giant Pac-Man chases a frightened Blinky to the right
        const k = t - 4.2;
        const gx = -40 + k * 75;
        ctx.drawImage(ghostSprite('blinky', frame, 'right', 'fright'), Math.round(gx - 7), y - 7);
        drawPac(ctx, gx - 48, y, 'right', mouth, 15);
      }
    } else if (g.intermission === 2) {
      // Blinky's sheet catches on a nail
      const nailX = W / 2;
      ctx.fillStyle = C.text;
      ctx.fillRect(nailX - 1, y - 12, 2, 8);
      const px = W + 20 - Math.min(t, 8) * 60;
      drawPac(ctx, px, y, 'left', mouth);
      const gx = Math.max(nailX + 8, px + 44);
      if (t < 2.4) {
        ctx.drawImage(ghostSprite('blinky', frame, 'left', 'normal'), Math.round(gx - 7), y - 7);
      } else if (t < 6) {
        // stretched: body elongates to the left, snagged on the nail
        const stretch = Math.min(28, (t - 2.4) * 12);
        ctx.fillStyle = GHOST_COLORS.blinky;
        ctx.fillRect(nailX, y - 2, Math.round(gx - nailX), 6);
        ctx.drawImage(ghostSprite('blinky', frame, 'left', 'normal'), Math.round(gx + stretch - 7), y - 7);
        ctx.fillRect(nailX, y - 4, 4, 10);
      } else {
        // snapped: Blinky stares at his torn sheet
        ctx.drawImage(ghostSprite('blinky', 0, t % 1 < 0.5 ? 'left' : 'right', 'normal'), Math.round(gx + 28 - 7), y - 7);
        ctx.fillStyle = GHOST_COLORS.blinky;
        ctx.fillRect(nailX, y - 4, 4, 10);
      }
    } else {
      // patched Blinky chases Pac-Man, then returns "naked" the other way
      if (t < 3.5) {
        const px = W + 20 - t * 75;
        drawPac(ctx, px, y, 'left', mouth);
        const gx = Math.round(px + 44);
        ctx.drawImage(ghostSprite('blinky', frame, 'left', 'normal'), gx - 7, y - 7);
        ctx.fillStyle = C.text;
        ctx.fillRect(gx - 4, y + 1, 4, 3);
        ctx.fillRect(gx + 2, y - 3, 3, 3);
      } else {
        const k = t - 3.5;
        const gx = -20 + k * 70;
        ctx.drawImage(ghostSprite('blinky', frame, 'right', 'eyes'), Math.round(gx - 7), y - 7);
        ctx.fillStyle = C.pink;
        ctx.fillRect(Math.round(gx - 5), y + 2, 10, 5);
        ctx.fillRect(Math.round(gx - 7), y + 4, 14, 2);
      }
    }
    const labels = ['', 'INTERVALO 1', 'INTERVALO 2', 'INTERVALO 3'];
    drawTextCentered(ctx, labels[g.intermission], W / 2, MAZE_Y + 26 * TILE, C.dim, 1);
    drawTextCentered(ctx, `FASE ${g.level}`, W / 2, MAZE_Y + 28 * TILE, C.dim, 1);
  }
}
