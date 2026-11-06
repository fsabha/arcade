import {
  TILE, FULL_SPEED, Dir, OPPOSITE, DX, DY, POINTS, EXTRA_LIFE_AT, START_LIVES, READY_TIME, READY_TIME_SHORT,
  DEATH_TIME, LEVEL_CLEAR_TIME, GHOST_EAT_PAUSE, FRUIT_TIME, FRUIT_SCORE_TIME, DOT_PAUSE, PELLET_PAUSE,
  PAC_START, FRUIT_POS, HOUSE_CENTER, HOUSE_LEFT, HOUSE_RIGHT, BLINKY_START, HOUSE_DOOR,
} from './config';
import { Maze, tileCenter } from './maze';
import { Actor } from './actors';
import { GhostName, chaseTarget, scatterTarget, chooseDir, randomDir, Tile } from './ghostai';
import { speeds, elroy, modeSchedule, fruitFor, houseLimits, houseTimeout, intermissionAfter, FruitKind } from './levels';
import { Rng, Shell, PAUSE_ITEMS } from '@arcade/shared';
import type { Input, ShellState } from '@arcade/shared';
import type { SoundFx } from './audio';
import { scores, settings, HighScore, Settings } from './storage';

export type State = ShellState;
/** What the round is doing while the shell is in 'playing'; 'over' once the last life is gone. */
export type Phase = 'ready' | 'playing' | 'ghosteat' | 'dying' | 'levelclear' | 'intermission' | 'over';

export type GhostState = 'house' | 'leaving' | 'normal' | 'frightened' | 'eyes' | 'entering';
export type Mode = 'scatter' | 'chase';

export class Ghost extends Actor {
  state: GhostState = 'house';
  dotCounter = 0;
  bounceDir: 1 | -1 = -1;
  elroy = 0;

  constructor(readonly name: GhostName, x: number, y: number, dir: Dir) {
    super(x, y, dir);
  }

  get tile(): Tile {
    return { x: this.col, y: this.row };
  }

  get inHouse(): boolean {
    return this.state === 'house' || this.state === 'leaving' || this.state === 'entering';
  }
}

export interface Fruit {
  kind: FruitKind;
  points: number;
  t: number;
}

export const MENU_ITEMS = ['JOGAR', 'COMO JOGAR', 'RANKING', 'CRT', 'SOM'] as const;
export { PAUSE_ITEMS };
const CORNER = 4; // px before/after a tile centre where Pac-Man may pre-turn
const GLOBAL_LIMITS = { pinky: 7, inky: 17, clyde: 32 } as const;
const EYES_SPEED = 1.5;
const FLASH_PERIOD = 0.28;

export class Game {
  shell: Shell<HighScore, Settings>;
  phase: Phase = 'ready';
  phaseTime = 0;
  maze = new Maze();
  pac = new Actor(tileCenter(PAC_START.x), tileCenter(PAC_START.y), 'left');
  pacDesired: Dir = 'left';
  pacMoving = false;
  pacAnim = 0; // mouth phase 0..1
  private pacPause = 0;
  ghosts: Ghost[] = [];

  level = 1;
  score = 0;
  highScore = 0;
  lives = START_LIVES;
  private extraLifeGiven = false;
  dotsEaten = 0;
  mode: Mode = 'scatter';
  private modeIdx = 0;
  private modeTimer = 0;
  frightTimer = 0;
  frightFlashing = false;
  private ghostChain = 0;
  private globalCounterActive = false;
  private globalDots = 0;
  private houseTimer = 0;
  fruit: Fruit | null = null;
  fruitScore = 0;
  fruitScoreT = 0;
  fruitsCollected: FruitKind[] = [];
  eatenGhost: Ghost | null = null;
  eatenPoints = 0;
  intermission: 0 | 1 | 2 | 3 = 0;
  firstReady = true;

  time = 0;
  deathReason = '';
  private rng = new Rng(1);

  constructor(private input: Input, private audio: SoundFx) {
    this.shell = new Shell<HighScore, Settings>({
      items: MENU_ITEMS,
      scores,
      settings,
      // the death tune already played; the arcade has no separate game over jingle
      audio: { blip: () => audio.blip(), setMuted: (m) => audio.setMuted(m), gameOver: () => undefined },
      onStart: () => this.startGame(),
      remote: { game: 'pacman', label: (e) => `NIVEL ${e.level}` },
      entry: (initials) => ({ initials, score: this.score, level: this.level, date: new Date().toISOString() }),
      probe: () => ({ initials: '', score: this.score, level: this.level, date: '' }),
      onStop: () => audio.loop('off'),
      gameOverDelay: 2.5,
    });
    this.highScore = this.shell.highScores[0]?.score ?? 0;
    this.placeActors();
  }

  // the shell owns the screens around the game; these keep the renderer and tests simple
  get state(): State { return this.shell.state; }
  get stateTime(): number { return this.shell.stateTime; }
  get menuIndex(): number { return this.shell.menuIndex; }
  get pauseIndex(): number { return this.shell.pauseIndex; }
  get initials(): string[] { return this.shell.initials; }
  get initialsPos(): number { return this.shell.initialsPos; }
  get qualifiesForRank(): boolean { return this.shell.qualifiesForRank; }
  get settings(): Settings { return this.shell.settings; }
  get highScores(): HighScore[] { return this.shell.highScores; }

  get blinky(): Ghost {
    return this.ghosts[0];
  }

  // ---------- state transitions ----------

  startGame(): void {
    this.rng = new Rng((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    this.level = 1;
    this.score = 0;
    this.lives = START_LIVES;
    this.extraLifeGiven = false;
    this.fruitsCollected = [];
    this.firstReady = true;
    this.startLevel();
    this.shell.setState('playing');
  }

  private startLevel(): void {
    this.maze.reset();
    this.dotsEaten = 0;
    this.globalCounterActive = false;
    this.fruit = null;
    this.fruitScoreT = 0;
    this.placeActors();
    for (const g of this.ghosts) g.dotCounter = 0;
    this.beginReady();
  }

  private beginReady(): void {
    this.mode = 'scatter';
    this.modeIdx = 0;
    this.modeTimer = 0;
    this.frightTimer = 0;
    this.frightFlashing = false;
    this.houseTimer = 0;
    this.pacPause = 0;
    this.setPhase('ready');
    this.audio.loop('off');
    if (this.firstReady) this.audio.intro();
  }

  private placeActors(): void {
    this.pac = new Actor(tileCenter(PAC_START.x), tileCenter(PAC_START.y), 'left');
    this.pacDesired = 'left';
    this.pacMoving = false;
    this.pacAnim = 0;
    const b = new Ghost('blinky', tileCenter(BLINKY_START.x), tileCenter(BLINKY_START.y), 'left');
    b.state = 'normal';
    const p = new Ghost('pinky', tileCenter(HOUSE_CENTER.x), tileCenter(HOUSE_CENTER.y), 'down');
    const i = new Ghost('inky', tileCenter(HOUSE_LEFT.x), tileCenter(HOUSE_LEFT.y), 'up');
    const c = new Ghost('clyde', tileCenter(HOUSE_RIGHT.x), tileCenter(HOUSE_RIGHT.y), 'up');
    const counters = this.ghosts.map((g) => g.dotCounter);
    this.ghosts = [b, p, i, c];
    this.ghosts.forEach((g, k) => (g.dotCounter = counters[k] ?? 0));
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  // ---------- update ----------

  update(dt: number): void {
    this.time += dt;
    if (!this.shell.update(dt, this.input)) return;
    this.phaseTime += dt;
    const inp = this.input;
    switch (this.phase) {
      case 'ready':
        this.readDirInput();
        if (this.phaseTime >= (this.firstReady ? READY_TIME + 2.2 : READY_TIME_SHORT)) {
          this.firstReady = false;
          this.setPhase('playing');
        }
        break;
      case 'playing': this.updatePlaying(dt); break;
      case 'ghosteat':
        if (this.phaseTime >= GHOST_EAT_PAUSE) {
          this.eatenGhost = null;
          this.setPhase('playing');
        }
        break;
      case 'dying': this.updateDying(); break;
      case 'levelclear': this.updateLevelClear(); break;
      case 'intermission':
        if (this.phaseTime >= this.intermissionLength() || inp.justPressed('confirm') || inp.justPressed('fire')) {
          this.intermission = 0;
          this.beginReady();
        }
        break;
      case 'over': break;
    }
  }

  intermissionLength(): number {
    return this.intermission === 1 ? 9 : this.intermission === 2 ? 8 : 7;
  }

  private readDirInput(): void {
    const inp = this.input;
    const dirs: Dir[] = ['up', 'down', 'left', 'right'];
    for (const d of dirs) if (inp.justPressed(d)) this.pacDesired = d;
    if (!dirs.some((d) => inp.justPressed(d))) {
      // keep the latest held direction that is still held
      if (!inp.isDown(this.pacDesired)) for (const d of dirs) if (inp.isDown(d)) this.pacDesired = d;
    }
  }

  private updatePlaying(dt: number): void {
    const inp = this.input;
    if (inp.justPressed('pause')) {
      this.shell.pause();
      return;
    }
    this.readDirInput();
    const sp = speeds(this.level);

    // Scatter / chase schedule (frozen while frightened)
    if (this.frightTimer > 0) {
      this.frightTimer -= dt;
      this.frightFlashing = this.frightTimer <= sp.flashes * FLASH_PERIOD;
      if (this.frightTimer <= 0) {
        this.frightTimer = 0;
        this.frightFlashing = false;
        for (const g of this.ghosts) if (g.state === 'frightened') g.state = 'normal';
      }
    } else {
      const sched = modeSchedule(this.level);
      this.modeTimer += dt;
      if (this.modeTimer >= sched[this.modeIdx]) {
        this.modeTimer -= sched[this.modeIdx];
        this.modeIdx = Math.min(sched.length - 1, this.modeIdx + 1);
        this.mode = this.modeIdx % 2 === 0 ? 'scatter' : 'chase';
        for (const g of this.ghosts) if (g.state === 'normal') g.dir = OPPOSITE[g.dir];
      }
    }

    // Pac-Man
    this.movePac(dt, sp);
    this.eatAtPacTile(sp);
    if (this.phase !== 'playing') return;

    // Ghost house release
    this.houseTimer += dt;
    if (this.houseTimer >= houseTimeout(this.level)) {
      this.houseTimer = 0;
      const g = this.nextInHouse();
      if (g) g.state = 'leaving';
    }

    // Ghosts
    for (const g of this.ghosts) this.moveGhost(g, dt, sp);
    this.checkGhostContacts();
    if (this.phase !== 'playing') return;

    // Fruit
    if (this.fruit) {
      this.fruit.t -= dt;
      if (this.fruit.t <= 0) this.fruit = null;
      else if (this.pac.row === FRUIT_POS.y && Math.abs(this.pac.x - tileCenter(FRUIT_POS.x)) < 6) {
        this.addScore(this.fruit.points);
        this.fruitScore = this.fruit.points;
        this.fruitScoreT = FRUIT_SCORE_TIME;
        this.fruitsCollected.push(this.fruit.kind);
        this.fruit = null;
        this.audio.eatFruit();
      }
    }
    this.fruitScoreT -= dt;

    // Background sound
    if (this.ghosts.some((g) => g.state === 'eyes' || g.state === 'entering')) this.audio.loop('eyes');
    else if (this.frightTimer > 0) this.audio.loop('fright');
    else this.audio.loop('siren', Math.min(4, Math.floor((this.dotsEaten / 244) * 5)));
  }

  private movePac(dt: number, sp: ReturnType<typeof speeds>): void {
    const p = this.pac;
    if (this.pacPause > 0) {
      this.pacPause -= dt;
      return;
    }
    const open = (c: number, r: number) => Maze.isOpen(c, r);
    const want = this.pacDesired;
    if (want !== p.dir) {
      if (want === OPPOSITE[p.dir]) {
        p.dir = want;
      } else if (Math.abs(p.centerOffset()) <= CORNER) {
        const n = p.ahead(want);
        if (open(n.c, n.r)) {
          p.snapToCenter();
          p.dir = want;
        }
      }
    }
    const speed = (this.frightTimer > 0 ? sp.frightPac : sp.pac) * FULL_SPEED;
    const moved = p.advance(speed * dt, open, () => {
      if (this.pacDesired !== p.dir && open(p.ahead(this.pacDesired).c, p.ahead(this.pacDesired).r)) p.dir = this.pacDesired;
      return true;
    });
    this.pacMoving = moved > 0.001;
    if (this.pacMoving) this.pacAnim = (this.pacAnim + dt * 10) % 1;
  }

  private eatAtPacTile(sp: ReturnType<typeof speeds>): void {
    const p = this.pac;
    const v = this.maze.eat(p.col, p.row);
    if (!v) return;
    this.dotsEaten++;
    this.houseTimer = 0;
    this.addScore(v === 2 ? POINTS.pellet : POINTS.dot);
    this.pacPause = v === 2 ? PELLET_PAUSE : DOT_PAUSE;
    if (v === 2) this.audio.pellet();
    else this.audio.waka();
    this.countDotForHouse();
    if (this.dotsEaten === 70 || this.dotsEaten === 170) {
      const f = fruitFor(this.level);
      this.fruit = { kind: f.kind, points: f.points, t: FRUIT_TIME };
    }
    if (v === 2 && sp.frightTime > 0) {
      this.frightTimer = sp.frightTime;
      this.frightFlashing = false;
      this.ghostChain = 0;
      for (const g of this.ghosts) {
        if (g.state === 'normal') { g.state = 'frightened'; g.dir = OPPOSITE[g.dir]; }
      }
    } else if (v === 2) {
      // levels without blue time: ghosts still reverse
      for (const g of this.ghosts) if (g.state === 'normal') g.dir = OPPOSITE[g.dir];
    }
    if (this.maze.dotsLeft <= 0) {
      this.audio.loop('off');
      this.setPhase('levelclear');
    }
  }

  private nextInHouse(): Ghost | null {
    for (const name of ['pinky', 'inky', 'clyde'] as const) {
      const g = this.ghosts.find((x) => x.name === name)!;
      if (g.state === 'house') return g;
    }
    return null;
  }

  private countDotForHouse(): void {
    if (this.globalCounterActive) {
      this.globalDots++;
      for (const name of ['pinky', 'inky', 'clyde'] as const) {
        const g = this.ghosts.find((x) => x.name === name)!;
        if (g.state === 'house' && this.globalDots === GLOBAL_LIMITS[name]) {
          g.state = 'leaving';
          if (name === 'clyde') this.globalCounterActive = false;
        }
      }
      return;
    }
    const g = this.nextInHouse();
    if (!g) return;
    g.dotCounter++;
    const limits = houseLimits(this.level);
    if (g.dotCounter >= limits[g.name as 'pinky' | 'inky' | 'clyde']) g.state = 'leaving';
  }

  private ghostSpeed(g: Ghost, sp: ReturnType<typeof speeds>): number {
    if (g.state === 'eyes' || g.state === 'entering') return EYES_SPEED * FULL_SPEED;
    if (Maze.isTunnel(g.col, g.row)) return sp.tunnel * FULL_SPEED;
    if (g.state === 'frightened') return sp.frightGhost * FULL_SPEED;
    if (g.name === 'blinky' && g.state === 'normal') {
      const e = elroy(this.level);
      const clyde = this.ghosts[3];
      const suppressed = clyde.state === 'house';
      if (!suppressed && this.maze.dotsLeft <= e.dots2) { g.elroy = 2; return e.speed2 * FULL_SPEED; }
      if (!suppressed && this.maze.dotsLeft <= e.dots1) { g.elroy = 1; return e.speed1 * FULL_SPEED; }
      g.elroy = 0;
    }
    return sp.ghost * FULL_SPEED;
  }

  private moveGhost(g: Ghost, dt: number, sp: ReturnType<typeof speeds>): void {
    const speed = this.ghostSpeed(g, sp);
    const doorX = tileCenter(HOUSE_DOOR.x);
    const exitY = tileCenter(BLINKY_START.y);
    const homeY = tileCenter(HOUSE_CENTER.y);

    switch (g.state) {
      case 'house': {
        // bob up and down inside the house
        g.y += g.bounceDir * 0.45 * FULL_SPEED * dt;
        if (g.y < homeY - 3) { g.y = homeY - 3; g.bounceDir = 1; }
        if (g.y > homeY + 3) { g.y = homeY + 3; g.bounceDir = -1; }
        g.dir = g.bounceDir === 1 ? 'down' : 'up';
        return;
      }
      case 'leaving': {
        const d = 0.5 * FULL_SPEED * dt;
        if (Math.abs(g.x - doorX) > 0.5) {
          g.dir = g.x < doorX ? 'right' : 'left';
          g.x += Math.sign(doorX - g.x) * Math.min(d, Math.abs(doorX - g.x));
        } else {
          g.x = doorX;
          g.dir = 'up';
          g.y -= Math.min(d, g.y - exitY);
          if (g.y <= exitY + 0.01) {
            g.y = exitY;
            g.state = 'normal';
            g.dir = 'left';
          }
        }
        return;
      }
      case 'entering': {
        const d = speed * dt;
        if (Math.abs(g.x - doorX) > 0.5) {
          g.dir = g.x < doorX ? 'right' : 'left';
          g.x += Math.sign(doorX - g.x) * Math.min(d, Math.abs(doorX - g.x));
        } else if (g.y < homeY - 0.01) {
          g.x = doorX;
          g.dir = 'down';
          g.y += Math.min(d, homeY - g.y);
        } else {
          g.y = homeY;
          g.state = 'leaving';
        }
        return;
      }
      default: {
        const isEyes = g.state === 'eyes';
        const open = (c: number, r: number) => Maze.isOpen(c, r, false);
        g.advance(speed * dt, open, () => {
          if (isEyes && g.col === 13 && g.row === 11) {
            g.state = 'entering';
            return false;
          }
          const target = isEyes
            ? { x: 13, y: 11 }
            : g.state === 'frightened'
              ? null
              : this.mode === 'scatter'
                ? scatterTarget(g.name)
                : chaseTarget(g.name, { x: this.pac.col, y: this.pac.row }, this.pac.dir, this.blinky.tile, g.tile);
          g.dir = target
            ? chooseDir(g.tile, g.dir, target, open, !isEyes)
            : randomDir(g.tile, g.dir, open, () => this.rng.next());
          return true;
        });
      }
    }
  }

  private checkGhostContacts(): void {
    const p = this.pac;
    for (const g of this.ghosts) {
      if (g.col !== p.col || g.row !== p.row) continue;
      if (g.state === 'normal') {
        this.die();
        return;
      }
      if (g.state === 'frightened') {
        const pts = POINTS.ghost[Math.min(3, this.ghostChain)];
        this.ghostChain++;
        this.addScore(pts);
        g.state = 'eyes';
        this.eatenGhost = g;
        this.eatenPoints = pts;
        this.audio.eatGhost();
        this.setPhase('ghosteat');
        return;
      }
    }
  }

  private addScore(points: number): void {
    this.score += points;
    if (this.score > this.highScore) this.highScore = this.score;
    if (!this.extraLifeGiven && this.score >= EXTRA_LIFE_AT) {
      this.extraLifeGiven = true;
      this.lives++;
      this.audio.extraLife();
    }
  }

  private die(): void {
    this.audio.loop('off');
    this.audio.death();
    this.setPhase('dying');
  }

  private updateDying(): void {
    if (this.phaseTime < DEATH_TIME) return;
    this.lives--;
    if (this.lives <= 0) {
      this.setPhase('over');
      this.shell.endGame();
      return;
    }
    const counters = this.ghosts.map((g) => g.dotCounter);
    this.placeActors();
    this.ghosts.forEach((g, i) => (g.dotCounter = counters[i]));
    this.globalCounterActive = true;
    this.globalDots = 0;
    this.fruit = null;
    this.beginReady();
  }

  private updateLevelClear(): void {
    if (this.phaseTime < LEVEL_CLEAR_TIME) return;
    const inter = intermissionAfter(this.level);
    this.level++;
    this.maze.reset();
    this.dotsEaten = 0;
    this.fruit = null;
    this.placeActors();
    for (const g of this.ghosts) g.dotCounter = 0;
    this.globalCounterActive = false;
    if (inter) {
      this.intermission = inter;
      this.audio.intermission();
      this.setPhase('intermission');
    } else {
      this.beginReady();
    }
  }
}

/** Direction vector helper for renderers. */
export function dirVec(d: Dir): { dx: number; dy: number } {
  return { dx: DX[d], dy: DY[d] };
}

export { TILE };
