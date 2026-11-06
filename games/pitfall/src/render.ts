import {
  W, H, PX, HUD_H, LEAVES_TOP, LEAVES_H, JUNGLE_TOP, GROUND_Y, GROUND_H, DIRT_TOP, TUNNEL_TOP, TUNNEL_Y, HARRY_H,
  LOG_H, LADDER_X, LADDER_W, WALL_W, VINE_ANCHOR_X, VINE_ANCHOR_Y, TREASURE_X, GAME_TIME, TOTAL_TREASURES, PIT_CENTER,
} from './config';
import { Game, MENU_ITEMS } from './game';
import { Room, decodeRoom, crocOpen, shiftHalf, CROC_X, HOLE_SINGLE, HOLE_TRIPLE, PIT_ZONE, TREASURE_NAMES } from './world';
import { sprite } from './sprites';
import {
  drawText, textWidth, drawMenuScreen, drawHowToScreen, drawRankingScreen, drawPausedScreen,
  drawGameOverScreen, drawInitialsScreen,
} from '@arcade/shared';

const C = {
  leaves: '#1c5c1c',
  leavesLight: '#3c9c3c',
  jungle: '#2c8c2c',
  trunk: '#8c5a2c',
  trunkDark: '#5c3a18',
  ground: '#c8a050',
  groundDark: '#a08030',
  dirt: '#6c4418',
  tunnel: '#000000',
  tunnelFloor: '#6c4418',
  brick: '#c03020',
  mortar: '#602010',
  ladder: '#c8a050',
  tar: '#101010',
  water: '#3060c8',
  vine: '#2c6c1c',
  text: '#dfe6ee',
  dim: '#8a97a6',
  gold: '#ffe14a',
  red: '#ff4a4a',
  green: '#3ddc84',
  hudScore: '#e8e8e8',
  hudTimer: '#f0d040',
};

// Trunk x positions (px) for the four tree patterns.
const TREES: number[][] = [
  [24, 88, 152, 232, 296],
  [40, 128, 208, 280],
  [16, 72, 136, 184, 248, 304],
  [56, 112, 200, 264],
];

// Static ragged leaf pattern (lighter patches on the dark canopy).
const LEAF_PATCHES: [number, number, number, number][] = [];
for (let x = 0; x < W; x += 12) {
  const h = 4 + ((x * 7) % 9);
  LEAF_PATCHES.push([x, LEAVES_TOP + LEAVES_H - h, 12, h]);
  const h2 = 2 + ((x * 5) % 6);
  LEAF_PATCHES.push([x + 4, LEAVES_TOP + 2 + ((x * 3) % 7), 6, h2]);
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private demoRoom: Room = decodeRoom(0xc4);

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
      this.drawRoom(this.demoRoom, g.time, g.time, null, null);
      this.drawHudStatic();
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(0, 0, W, H);
      if (g.state === 'menu') this.drawMenu(g);
      else if (g.state === 'howto') this.drawHowTo();
      else this.drawRanking(g, true);
      return;
    }

    this.drawRoom(g.room, g.roomTime, g.time, g, g.treasureHere);
    this.drawHud(g);
    if (g.state === 'paused') this.drawPaused(g);
    else if (g.state === 'gameover') this.drawGameOver(g);
    else if (g.state === 'initials') this.drawInitials(g);
  }

  // ---------- world ----------

  private drawRoom(room: Room, roomTime: number, time: number, g: Game | null, treasure: number | null): void {
    const ctx = this.ctx;
    // canopy
    ctx.fillStyle = C.leaves;
    ctx.fillRect(0, LEAVES_TOP, W, LEAVES_H);
    ctx.fillStyle = C.leavesLight;
    for (const [x, y, w, h] of LEAF_PATCHES) ctx.fillRect(x, y, w, h);
    // jungle and trunks
    ctx.fillStyle = C.jungle;
    ctx.fillRect(0, JUNGLE_TOP, W, GROUND_Y - JUNGLE_TOP);
    for (const x of TREES[room.trees]) {
      ctx.fillStyle = C.trunk;
      ctx.fillRect(x, JUNGLE_TOP, 10, GROUND_Y - JUNGLE_TOP);
      ctx.fillStyle = C.trunkDark;
      ctx.fillRect(x + 8, JUNGLE_TOP, 2, GROUND_Y - JUNGLE_TOP);
      ctx.fillRect(x, JUNGLE_TOP, 2, GROUND_Y - JUNGLE_TOP);
    }
    // ground
    ctx.fillStyle = C.ground;
    ctx.fillRect(0, GROUND_Y, W, GROUND_H);
    ctx.fillStyle = C.groundDark;
    ctx.fillRect(0, GROUND_Y + GROUND_H - 2, W, 2);
    // underground
    ctx.fillStyle = C.dirt;
    ctx.fillRect(0, DIRT_TOP, W, TUNNEL_TOP - DIRT_TOP);
    ctx.fillStyle = C.tunnel;
    ctx.fillRect(0, TUNNEL_TOP, W, TUNNEL_Y - TUNNEL_TOP);
    ctx.fillStyle = C.tunnelFloor;
    ctx.fillRect(0, TUNNEL_Y, W, H - TUNNEL_Y);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, TUNNEL_Y + 6, W, H - TUNNEL_Y - 6);

    this.drawPits(room, roomTime);
    if (room.hasLadder) this.drawLadderAndWall(room);
    else this.drawScorpion(g ? g.scorpionX : 152, time);

    if (room.hasVine) this.drawVine(g ? g.vineAngle : 0.6 * Math.sin((2 * Math.PI * time) / 2.6));

    // objects
    const logs = g ? g.logs : room.objects.filter((o) => o.kind === 'log');
    const logFrame = Math.floor(time * 10) % 2;
    for (const l of logs) ctx.drawImage(sprite(`log${l.rolling ? logFrame : 0}`), Math.round(l.x), GROUND_Y - LOG_H);
    for (const o of room.objects) {
      if (o.kind === 'fire') ctx.drawImage(sprite(`fire${Math.floor(time * 8) % 2}`), o.x, GROUND_Y - 14);
      else if (o.kind === 'snake') ctx.drawImage(sprite(`snake${Math.floor(time * 4) % 2}`), o.x, GROUND_Y - 10);
    }
    if (treasure !== null || (!g && room.treasure !== null)) {
      const t = treasure ?? room.treasure ?? 0;
      const s = sprite(TREASURE_NAMES[t]);
      ctx.drawImage(s, TREASURE_X, GROUND_Y - s.height);
    }

    if (g) this.drawHarry(g);
    else ctx.drawImage(sprite('stand'), 40, GROUND_Y - HARRY_H);
  }

  private drawPits(room: Room, t: number): void {
    const ctx = this.ctx;
    const cut = (r: [number, number], color: string, deep: boolean) => {
      ctx.fillStyle = color;
      ctx.fillRect(r[0] * PX, GROUND_Y, (r[1] - r[0]) * PX, deep ? TUNNEL_TOP - GROUND_Y : GROUND_H);
    };
    switch (room.scene) {
      case 'hole1': for (const r of HOLE_SINGLE) cut(r, '#000', true); break;
      case 'hole3': for (const r of HOLE_TRIPLE) cut(r, '#000', true); break;
      case 'tar': cut(PIT_ZONE, C.tar, false); break;
      case 'water': cut(PIT_ZONE, C.water, false); break;
      case 'croc': {
        cut(PIT_ZONE, C.water, false);
        const open = crocOpen(t);
        for (const x of CROC_X) {
          const s = sprite(open ? 'crocOpen' : 'crocClosed');
          ctx.drawImage(s, (x - 6) * PX, GROUND_Y - s.height + 2);
        }
        break;
      }
      case 'treasure':
      case 'shiftTar':
      case 'shiftWater': {
        const h = shiftHalf(t);
        if (h > 0) cut([PIT_CENTER / PX - h, PIT_CENTER / PX + h], room.scene === 'shiftWater' ? C.water : C.tar, false);
        break;
      }
    }
  }

  private drawLadderAndWall(room: Room): void {
    const ctx = this.ctx;
    // ladder from the hole down to the tunnel floor
    ctx.fillStyle = C.ladder;
    ctx.fillRect(LADDER_X, GROUND_Y, 2, TUNNEL_Y - GROUND_Y);
    ctx.fillRect(LADDER_X + LADDER_W - 2, GROUND_Y, 2, TUNNEL_Y - GROUND_Y);
    for (let y = GROUND_Y + 4; y < TUNNEL_Y; y += 6) ctx.fillRect(LADDER_X + 2, y, LADDER_W - 4, 1);
    // brick wall
    const wx = room.wallRight ? 272 : 34;
    ctx.fillStyle = C.brick;
    ctx.fillRect(wx, TUNNEL_TOP, WALL_W, TUNNEL_Y - TUNNEL_TOP);
    ctx.fillStyle = C.mortar;
    for (let y = TUNNEL_TOP + 3; y < TUNNEL_Y; y += 4) {
      ctx.fillRect(wx, y, WALL_W, 1);
      const off = ((y - TUNNEL_TOP) / 4) % 2 === 0 ? 4 : 10;
      ctx.fillRect(wx + off, y - 3, 1, 3);
    }
  }

  private drawScorpion(x: number, time: number): void {
    const s = sprite(`scorpion${Math.floor(time * 6) % 2}`);
    this.ctx.drawImage(s, Math.round(x), TUNNEL_Y - s.height);
  }

  private drawVine(angle: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = C.vine;
    const len = 92;
    const steps = len;
    for (let i = 0; i <= steps; i++) {
      const x = VINE_ANCHOR_X + Math.sin(angle) * i;
      const y = VINE_ANCHOR_Y + Math.cos(angle) * i;
      ctx.fillRect(Math.round(x) - 1, Math.round(y), 2, 1);
    }
  }

  private drawHarry(g: Game): void {
    const h = g.harry;
    const ctx = this.ctx;
    let name = 'stand';
    switch (h.mode) {
      case 'ground': name = h.running ? `run${Math.floor(h.runPhase) % 3}` : 'stand'; break;
      case 'jump':
      case 'drop':
      case 'fall': name = 'jump'; break;
      case 'climb': name = `climb${Math.floor(h.runPhase) % 2}`; break;
      case 'swing': name = 'swing'; break;
      case 'kneel':
      case 'sink': name = 'kneel'; break;
      case 'dying': name = Math.floor(h.t * 8) % 2 ? 'kneel' : 'stand'; break;
    }
    if (h.mode === 'sink') {
      // only the part above the pit surface shows
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, GROUND_Y);
      ctx.clip();
    }
    ctx.drawImage(sprite(name, h.facing < 0 && name.indexOf('climb') !== 0), Math.round(h.x), Math.round(h.feet) - HARRY_H);
    if (h.mode === 'sink') ctx.restore();
  }

  // ---------- HUD ----------

  private drawHudStatic(): void {
    drawText(this.ctx, '002000', 48, 3, C.hudScore);
    drawText(this.ctx, '20:00', 48, 10, C.hudTimer);
  }

  private drawHud(g: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, HUD_H);
    drawText(ctx, String(g.score).padStart(6, '0'), 48, 3, C.hudScore);
    const t = Math.ceil(g.timeLeft);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    const flash = g.timeLeft <= 10 && Math.floor(g.time * 4) % 2 === 0;
    drawText(ctx, `${mm}:${ss}`, 48, 10, flash ? C.red : C.hudTimer);
    ctx.fillStyle = C.hudTimer;
    for (let i = 0; i < g.lives - 1; i++) ctx.fillRect(24 + i * 6, 10, 2, 5);
    drawText(ctx, `${g.treasures}/${TOTAL_TREASURES}`, W - 8 - textWidth(`${g.treasures}/${TOTAL_TREASURES}`), 3, C.dim);
  }

  // ---------- screens (shared look, game-specific words) ----------

  private drawMenu(g: Game): void {
    drawMenuScreen(this.ctx, W, H, {
      title: 'PITFALL', titleColor: C.green, titleY: 30, subtitle: 'A AVENTURA DE HARRY NA SELVA',
      labels: MENU_ITEMS.map((item) => g.shell.label(item)),
      selected: g.menuIndex, time: g.time, itemsY: 78,
      footer: ['SETAS MOVEM  ESPACO PULA  ENTER CONFIRMA', 'ACTIVISION 1982  EDICAO BROWSER'], footerY: 162,
    });
  }

  private drawHowTo(): void {
    drawHowToScreen(this.ctx, W, H, [
      'ACHE OS 32 TESOUROS EM 20 MINUTOS',
      'SETAS CORREM  ESPACO OU X PULA',
      'BAIXO NO BURACO DESCE A ESCADA',
      'PULE NO CIPO  BAIXO OU ESPACO SOLTA',
      'TORAS TIRAM PONTOS  BURACO TIRA 100',
      'FOGO COBRA ESCORPIAO E PANTANO MATAM',
      'JACARE: PULE DE CABECA EM CABECA', 'SO COM A BOCA FECHADA',
      'NO TUNEL CADA TELA VALE TRES',
    ], { y0: 48 });
  }

  private drawRanking(g: Game, menu: boolean): void {
    const rows = g.highScores.map((h, i) => `${String(i + 1).padStart(2, ' ')}  ${h.initials.padEnd(3, ' ')}  ${String(h.score).padStart(6, ' ')}  ${String(h.level).padStart(2, ' ')} TES`);
    drawRankingScreen(this.ctx, W, H, rows, menu, { y0: 46, shell: g.shell });
  }

  private drawPaused(g: Game): void {
    drawPausedScreen(this.ctx, W, H, g.pauseIndex);
  }

  private drawGameOver(g: Game): void {
    const used = GAME_TIME - g.timeLeft;
    const finished = g.endReason === 'finished';
    drawGameOverScreen(this.ctx, W, H, {
      title: finished ? 'PARABENS' : g.endReason === 'time' ? 'TEMPO ESGOTADO' : 'FIM DE JOGO',
      titleColor: finished ? C.green : C.red,
      highlight: finished ? 'TODOS OS TESOUROS ENCONTRADOS' : undefined,
      lines: [
        `PONTOS ${g.score}`,
        `TESOUROS ${g.treasures} DE ${TOTAL_TREASURES}`,
        `TEMPO ${Math.floor(used / 60)}:${String(Math.floor(used % 60)).padStart(2, '0')}  TELAS ${g.roomsVisited}`,
      ],
      qualifies: g.qualifiesForRank, stateTime: g.stateTime,
    });
  }

  private drawInitials(g: Game): void {
    drawInitialsScreen(this.ctx, W, H, `${g.score} PONTOS`, g.initials, g.initialsPos, g.time);
  }
}
