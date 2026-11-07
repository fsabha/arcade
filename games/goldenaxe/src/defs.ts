import type { ActorDef, MoveDef, Palette, RigDef } from '@arcade/brawl';
import { AX_SHEET } from './sheets/ax';

// ---------- moves ----------

const hit = (start: number, end: number, x: number, w: number, damage: number, knock: 'hit' | 'down' | 'launch', push = 70, y = 6, h = 34) => ({ start, end, box: { x, y, w, h }, damage, knock, push });

/** Three-hit sword combo: slash, slash back, overhead that knocks down. */
function swordCombo(reach: number, dmg: number): Record<string, MoveDef> {
  return {
    combo1: { duration: 0.32, frames: [hit(0.08, 0.2, 4, reach, dmg, 'hit')], chain: 'combo2' },
    combo2: { duration: 0.32, frames: [hit(0.08, 0.2, 4, reach, dmg, 'hit')], chain: 'combo3' },
    combo3: { duration: 0.46, frames: [hit(0.12, 0.3, 2, reach + 6, dmg + 1, 'down', 120)] },
    jumpAttack: { duration: 0.45, frames: [hit(0.05, 0.35, 2, reach + 4, dmg + 1, 'down', 90, 0, 40)] },
    dashAttack: { duration: 0.42, frames: [hit(0.05, 0.3, 4, reach + 10, dmg + 1, 'down', 160)], lunge: 160 },
    knee: { duration: 0.3, frames: [hit(0.08, 0.2, 4, 18, 1, 'hit', 0)] },
    throw: { duration: 0.6, frames: [] },
  };
}

function enemyCombo(reach: number, dmg: number, slow = 1): Record<string, MoveDef> {
  return {
    combo1: { duration: 0.5 * slow, frames: [hit(0.18 * slow, 0.3 * slow, 4, reach, dmg, 'hit', 70)] },
    combo2: { duration: 0.7 * slow, frames: [hit(0.3 * slow, 0.45 * slow, 2, reach + 6, dmg, 'down', 110)] },
    knee: { duration: 0.3, frames: [hit(0.08, 0.2, 4, 18, 1, 'hit', 0)] },
    throw: { duration: 0.6, frames: [] },
  };
}

// ---------- palettes ----------

const skin = { skin: '#f0c090', skinDark: '#c89060' };
function pal(p: Partial<Palette>): Palette {
  return { ...skin, hair: '#402010', top: '#8080a0', topDark: '#505070', legs: '#604020', legsDark: '#402810', boots: '#302010', weapon: '#d0d8e0', weaponDark: '#707880', ...p };
}

const rig = (r: Partial<RigDef> & { palette: Palette }): RigDef => ({ scale: 1, weapon: 'sword', head: 'bare', ...r });

// ---------- heroes ----------

export const HEROES: Record<string, ActorDef> = {
  ax: {
    id: 'ax', name: 'AX BATTLER', hp: 12, speed: 78, width: 16, height: 44, points: 0, grabbable: false, maxMagic: 4,
    rig: rig({ palette: pal({ hair: '#4a2810', top: '#3060c0', topDark: '#203880', legs: '#2048a0', legsDark: '#183070', boots: '#5a3a1a' }), bareChest: true, weapon: 'sword', head: 'bare', bulk: 0.5 }),
    sheet: AX_SHEET,
    attacks: swordCombo(26, 1),
  },
  tyris: {
    id: 'tyris', name: 'TYRIS FLARE', hp: 12, speed: 86, width: 14, height: 42, points: 0, grabbable: false, maxMagic: 6,
    rig: rig({ palette: pal({ skin: '#f4d0a8', hair: '#e0c050', top: '#e04040', topDark: '#a02020', legs: '#e04040', legsDark: '#a02020', boots: '#c08040' }), slim: true, weapon: 'sword', head: 'long' }),
    attacks: swordCombo(22, 1),
  },
  gilius: {
    id: 'gilius', name: 'GILIUS THUNDERHEAD', hp: 12, speed: 70, width: 16, height: 36, points: 0, grabbable: false, maxMagic: 3,
    rig: rig({ palette: pal({ hair: '#e0e0e0', top: '#40a040', topDark: '#287028', legs: '#704828', legsDark: '#503018', boots: '#302010', weapon: '#e0e8f0', weaponDark: '#806040' }), weapon: 'axe', head: 'horns', scale: 0.85, bulk: 1 }),
    attacks: swordCombo(24, 1),
  },
};

// ---------- enemies ----------

const HENINGER_COLOURS = ['#3060c0', '#30a040', '#c08030', '#c0c8d0']; // blue, green, bronze, silver: weak to strong

function heninger(variant: number): ActorDef {
  const c = HENINGER_COLOURS[variant] ?? HENINGER_COLOURS[0];
  return {
    id: `heninger${variant}`, name: 'HENINGER', hp: 4, speed: 58, width: 16, height: 44, points: 200 + variant * 100, grabbable: true,
    rig: rig({ palette: pal({ top: c, topDark: '#303850', legs: '#504030', legsDark: '#302010', hair: '#202020' }), weapon: 'sword', head: 'helmet' }),
    attacks: enemyCombo(24, 1), ai: { range: 24, cooldown: 1.6, flank: 0.35, caution: 0.3, approach: 1 },
  };
}

function longmoan(variant: number): ActorDef {
  const c = HENINGER_COLOURS[variant] ?? HENINGER_COLOURS[0];
  return {
    id: `longmoan${variant}`, name: 'LONGMOAN', hp: 5, speed: 52, width: 18, height: 46, points: 300 + variant * 100, grabbable: true,
    rig: rig({ palette: pal({ top: c, topDark: '#303850', legs: '#404040', legsDark: '#202020', hair: '#302010', weapon: '#806040', weaponDark: '#503818' }), weapon: 'club', head: 'bare', bulk: 0.6 }),
    attacks: enemyCombo(26, 1, 1.15), ai: { range: 26, cooldown: 1.9, flank: 0.25, caution: 0.2, approach: 0.9, grabs: true },
  };
}

function amazon(variant: number): ActorDef {
  const c = ['#c04080', '#a040c0', '#c08020'][variant] ?? '#c04080';
  return {
    id: `amazon${variant}`, name: 'STORCHINAYA', hp: 4, speed: 80, width: 14, height: 42, points: 400 + variant * 100, grabbable: true,
    rig: rig({ palette: pal({ skin: '#f0c8a0', hair: '#202020', top: c, topDark: '#602040', legs: c, legsDark: '#602040', boots: '#404040' }), slim: true, weapon: 'sword', head: 'helmet' }),
    attacks: enemyCombo(22, 1, 0.85), ai: { range: 22, cooldown: 1.2, flank: 0.5, caution: 0.5, approach: 1.1 },
  };
}

const skeleton: ActorDef = {
  id: 'skeleton', name: 'SKELETON', hp: 6, speed: 64, width: 14, height: 42, points: 600, grabbable: false,
  rig: rig({ palette: pal({ skin: '#e8e8d8', skinDark: '#b0b0a0', top: '#e8e8d8', topDark: '#a0a090', legs: '#e8e8d8', legsDark: '#a0a090', boots: '#d0d0c0', hair: '#e8e8d8' }), weapon: 'sword', head: 'skull' }),
  attacks: enemyCombo(26, 2, 0.9), ai: { range: 24, cooldown: 1.3, flank: 0.3, caution: 0.1, approach: 1, armor: 1 },
};

function giant(id: string, name: string, colour: string, hp: number, points: number): ActorDef {
  return {
    id, name, hp, speed: 44, width: 28, height: 70, points, grabbable: false,
    rig: rig({ palette: pal({ top: colour, topDark: '#303030', legs: '#404048', legsDark: '#202028', boots: '#202020', hair: '#202020', weapon: '#a0a8b0', weaponDark: '#505860' }), weapon: 'hammer', head: 'helmet', scale: 1.6, bulk: 1.2 }),
    attacks: {
      combo1: { duration: 0.9, frames: [hit(0.4, 0.6, 4, 46, 2, 'down', 150, 0, 60)] },
      combo2: { duration: 1.1, frames: [hit(0.5, 0.75, -10, 70, 3, 'launch', 170, 0, 60)] },
      knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
    },
    ai: { range: 40, cooldown: 2.2, flank: 0.15, caution: 0, approach: 0.9, armor: 2 },
  };
}

function knight(id: string, name: string, colour: string, hp: number, points: number): ActorDef {
  return {
    id, name, hp, speed: 60, width: 20, height: 54, points, grabbable: false,
    rig: rig({ palette: pal({ top: colour, topDark: '#303840', legs: '#505860', legsDark: '#303840', boots: '#202020', weapon: '#e0e8f0', weaponDark: '#708090', hair: '#202020' }), weapon: 'sword', head: 'helmet', scale: 1.2, bulk: 0.8 }),
    attacks: {
      combo1: { duration: 0.5, frames: [hit(0.15, 0.3, 4, 34, 2, 'hit', 80, 0, 50)] },
      combo2: { duration: 0.7, frames: [hit(0.28, 0.45, 2, 40, 2, 'down', 130, 0, 50)], },
      knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
    },
    ai: { range: 32, cooldown: 1.5, flank: 0.3, caution: 0.3, approach: 1, armor: 2 },
  };
}

const deathAdder: ActorDef = {
  id: 'deathadder', name: 'DEATH ADDER', hp: 40, speed: 50, width: 30, height: 74, points: 10000, grabbable: false,
  rig: rig({ palette: pal({ top: '#c0a020', topDark: '#706010', legs: '#604020', legsDark: '#402010', boots: '#202020', weapon: '#ffe040', weaponDark: '#a08020', hair: '#202020' }), weapon: 'axe', head: 'horns', scale: 1.7, bulk: 1.3 }),
  attacks: {
    combo1: { duration: 0.8, frames: [hit(0.3, 0.5, 4, 52, 3, 'down', 150, 0, 70)] },
    combo2: { duration: 1.2, frames: [hit(0.55, 0.8, -20, 90, 4, 'launch', 190, 0, 70)] },
    knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
  },
  ai: { range: 46, cooldown: 2.0, flank: 0.2, caution: 0.1, approach: 1, armor: 3, ranged: { range: 160, speed: 180, damage: 2, height: 20 } },
};

const deathBringer: ActorDef = {
  id: 'deathbringer', name: 'DEATH BRINGER', hp: 50, speed: 54, width: 30, height: 74, points: 20000, grabbable: false,
  rig: rig({ palette: pal({ top: '#5030a0', topDark: '#301860', legs: '#302040', legsDark: '#181020', boots: '#101010', weapon: '#e0b0ff', weaponDark: '#8040c0', hair: '#202020' }), weapon: 'axe', head: 'horns', scale: 1.7, bulk: 1.3 }),
  attacks: {
    combo1: { duration: 0.7, frames: [hit(0.25, 0.45, 4, 56, 3, 'down', 160, 0, 70)] },
    combo2: { duration: 1.1, frames: [hit(0.5, 0.75, -24, 100, 5, 'launch', 200, 0, 70)] },
    knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
  },
  ai: { range: 48, cooldown: 1.7, flank: 0.3, caution: 0.1, approach: 1.1, armor: 3, ranged: { range: 170, speed: 220, damage: 3, height: 20 } },
};

// ---------- thieves and mounts ----------

const thiefPal = pal({ skin: '#f0d0b0', hair: '#404040', legs: '#404040', legsDark: '#202020', boots: '#202020' });
export const THIEVES: Record<string, ActorDef> = {
  thiefBlue: { id: 'thiefBlue', name: 'LADRAO', hp: 1, speed: 92, width: 12, height: 26, points: 0, grabbable: false, attacks: {},
    rig: rig({ palette: { ...thiefPal, top: '#3060e0', topDark: '#203890' }, scale: 0.6, weapon: 'none', head: 'hood' }),
    ai: { range: 0, cooldown: 9, flank: 0, caution: 0, approach: 1, flee: true }, drop: { kind: 'pot' } },
  thiefGreen: { id: 'thiefGreen', name: 'LADRAO', hp: 1, speed: 88, width: 12, height: 26, points: 0, grabbable: false, attacks: {},
    rig: rig({ palette: { ...thiefPal, top: '#30a040', topDark: '#206028' }, scale: 0.6, weapon: 'none', head: 'hood' }),
    ai: { range: 0, cooldown: 9, flank: 0, caution: 0, approach: 1, flee: true }, drop: { kind: 'food', value: 4 } },
};

export const MOUNTS: Record<string, ActorDef> = {
  chickenleg: { id: 'chickenleg', name: 'BIZARRIAN', hp: 8, speed: 60, width: 26, height: 30, points: 0, grabbable: false, attacks: {},
    rig: rig({ palette: pal({ top: '#60c0e0', topDark: '#3080a0', legs: '#f0a040', legsDark: '#b07020', weapon: '#804020' }), beast: 'chicken', weapon: 'none', head: 'beast' }),
    mount: { speed: 95, attack: { duration: 0.45, frames: [hit(0.1, 0.3, -36, 44, 2, 'down', 150, 0, 30)], pose: 'idle' } } },
  dragonBlue: { id: 'dragonBlue', name: 'DRAGAO', hp: 10, speed: 56, width: 34, height: 32, points: 0, grabbable: false, attacks: {},
    rig: rig({ palette: pal({ top: '#4070e0', topDark: '#2040a0', legs: '#4070e0', legsDark: '#2040a0', weapon: '#804020' }), beast: 'dragon', weapon: 'none', head: 'beast' }),
    mount: { speed: 85, attack: { duration: 0.6, frames: [hit(0.15, 0.45, 18, 70, 3, 'down', 140, 0, 30)], pose: 'idle' } } },
  dragonRed: { id: 'dragonRed', name: 'DRAGAO', hp: 10, speed: 56, width: 34, height: 32, points: 0, grabbable: false, attacks: {},
    rig: rig({ palette: pal({ top: '#e04040', topDark: '#902020', legs: '#e04040', legsDark: '#902020', weapon: '#804020' }), beast: 'dragon', weapon: 'none', head: 'beast' }),
    mount: { speed: 85, attack: { duration: 0.6, frames: [hit(0.15, 0.45, 18, 110, 4, 'launch', 160, 0, 30)], pose: 'idle' } } },
};

export const ENEMIES: Record<string, ActorDef> = {
  heninger0: heninger(0), heninger1: heninger(1), heninger2: heninger(2), heninger3: heninger(3),
  longmoan0: longmoan(0), longmoan1: longmoan(1), longmoan2: longmoan(2), longmoan3: longmoan(3),
  amazon0: amazon(0), amazon1: amazon(1), amazon2: amazon(2),
  skeleton,
  badbrother: giant('badbrother', 'BAD BROTHER', '#c05020', 14, 3000),
  sgtmalt: giant('sgtmalt', 'SGT. MALT', '#4060c0', 16, 3500),
  heartland: giant('heartland', 'GEN. HEARTLAND', '#a0a0a8', 20, 5000),
  bitter: knight('bitter', 'LT. BITTER', '#c0c8d0', 16, 4000),
  scrooge: knight('scrooge', 'LT. SCROOGE', '#c0a040', 18, 4500),
  deathadder: deathAdder, deathbringer: deathBringer,
};

export const DEFS: Record<string, ActorDef> = { ...HEROES, ...ENEMIES, ...THIEVES, ...MOUNTS };
