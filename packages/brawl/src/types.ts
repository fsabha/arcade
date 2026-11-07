import type { RigDef } from './rig';

export type Team = 'hero' | 'enemy' | 'neutral';

/** A box in actor space: x along facing (positive = in front), y = height above the feet. */
export interface Box { x: number; y: number; w: number; h: number }

export type Knock = 'hit' | 'down' | 'launch';

export interface AttackFrame {
  /** active window inside the move, in seconds */
  start: number;
  end: number;
  box: Box;
  damage: number;
  knock: Knock;
  /** horizontal push on the target, px/s */
  push: number;
}

export interface MoveDef {
  duration: number;
  frames: AttackFrame[];
  /** combo: pressing attack after `chainAfter` seconds (and before the end) starts this move */
  chain?: string;
  chainAfter?: number;
  /** lunge forward, px/s during the move */
  lunge?: number;
  /** pose name used by the rig; defaults to the move name */
  pose?: string;
}

export interface AiDef {
  /** preferred attack distance */
  range: number;
  /** seconds between attacks */
  cooldown: number;
  /** 0..1: how often it circles to the other side instead of coming straight */
  flank: number;
  /** 0..1: chance to step back when the hero swings */
  caution: number;
  /** walking speed multiplier while approaching */
  approach: number;
  /** can grab the hero */
  grabs?: boolean;
  /** ranged attack: a projectile every `cooldown` from this distance */
  ranged?: { range: number; speed: number; damage: number; height: number };
  /** boss: never grabbed, shrugs off stagger after this many hits in a row */
  armor?: number;
  /** thieves: run from the heroes instead of fighting */
  flee?: boolean;
}

export interface ActorDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  /** body collision box width/height (px) */
  width: number;
  height: number;
  rig: RigDef;
  attacks: Record<string, MoveDef>;
  /** points when defeated */
  points: number;
  /** can be grabbed/thrown by heroes */
  grabbable: boolean;
  ai?: AiDef;
  /** heroes: how many hearts/pots the HUD shows */
  maxMagic?: number;
  /** rideable creature */
  mount?: { attack: MoveDef; speed: number };
  /** what a thief drops when hit */
  drop?: { kind: ItemKind; value?: number };
}

export type ItemKind = 'pot' | 'food' | 'points' | 'life' | 'special' | 'weapon';

export interface ItemDef {
  kind: ItemKind;
  x: number;
  y: number;
  value?: number;
  /** weapon id for kind 'weapon' */
  weapon?: string;
}

export interface Spawn {
  def: string;
  /** offset from the screen edge: negative = from the left, positive = from the right */
  side: -1 | 1;
  y: number;
  /** seconds after the wave starts */
  delay?: number;
  /** enemy colour/strength variant */
  variant?: number;
}

export interface Wave {
  /** camera lock: the stage stops scrolling here until the wave is cleared */
  at: number;
  spawns: Spawn[];
  boss?: boolean;
}

export interface Mount {
  def: string;
  x: number;
  y: number;
  variant?: number;
}

export interface StageDef {
  id: string;
  name: string;
  /** world length in px */
  length: number;
  /** walkable band (depth) in screen px */
  floorTop: number;
  floorBottom: number;
  waves: Wave[];
  items: ItemDef[];
  mounts: Mount[];
  theme: string;
  /** thieves run across at the end of the stage (Golden Axe camp) */
  camp?: boolean;
}
