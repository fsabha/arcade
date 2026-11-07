import { scaleDefs } from '@arcade/brawl';
import type { ActorDef, MoveDef, Palette, RigDef } from '@arcade/brawl';
import { LOOKS } from './looks';

// ---------- moves ----------

const hit = (start: number, end: number, x: number, w: number, damage: number, knock: 'hit' | 'down' | 'launch', push = 70, y = 6, h = 34, stun?: number) => ({ start, end, box: { x, y, w, h }, damage, knock, push, stun });

/**
 * Bare-handed hero combo: jab, straight, kick that knocks down; jump kick; dash kick;
 * knees while holding and the back throw. `p` is the punch damage, `k` the kick, `t` the tempo (1 = Axel).
 */
function brawlerCombo(reach: number, p: number, k: number, t = 1): Record<string, MoveDef> {
  return {
    combo1: { duration: 0.28 * t, frames: [hit(0.05 * t, 0.16 * t, 4, reach, p, 'hit', 60)], chain: 'combo2', pose: 'punch' },
    combo2: { duration: 0.28 * t, frames: [hit(0.05 * t, 0.16 * t, 4, reach, p, 'hit', 70)], chain: 'combo3', pose: 'punch2' },
    combo3: { duration: 0.44 * t, frames: [hit(0.08 * t, 0.26 * t, 2, reach + 8, k, 'down', 130)], pose: 'kick' },
    jumpAttack: { duration: 0.5, frames: [hit(0.05, 0.4, 2, reach + 8, k, 'down', 100, 0, 40)], pose: 'jumpKick' },
    dashAttack: { duration: 0.42 * t, frames: [hit(0.05 * t, 0.3 * t, 4, reach + 10, k, 'down', 170)], lunge: 170, pose: 'kick' },
    knee: { duration: 0.3, frames: [hit(0.08, 0.2, 4, 18, p, 'hit', 0)] },
    throw: { duration: 0.6, frames: [] },
  };
}

/** Held weapons replace the combo: two swings, the second knocks down. The pepper shaker only dazes. */
function weaponMoves(p: number, t = 1): Record<string, Record<string, MoveDef>> {
  const two = (reach: number, d1: number, d2: number, slow: number, knock2: 'down' | 'launch' = 'down'): Record<string, MoveDef> => ({
    combo1: { duration: 0.34 * t * slow, frames: [hit(0.08 * t * slow, 0.2 * t * slow, 4, reach, d1, 'hit', 80, 4, 40)], chain: 'combo2', pose: 'combo1' },
    combo2: { duration: 0.44 * t * slow, frames: [hit(0.1 * t * slow, 0.28 * t * slow, 2, reach + 4, d2, knock2, 140, 4, 40)], pose: 'combo2' },
  });
  return {
    pipe: two(32, p + 2, p + 3, 1),
    bat: two(34, p + 3, p + 4, 1.15, 'launch'),
    knife: two(22, p + 2, p + 2, 0.85),
    bottle: two(24, p + 1, p + 2, 0.95),
    shaker: { combo1: { duration: 0.34 * t, frames: [hit(0.08 * t, 0.2 * t, 4, 22, 1, 'hit', 20, 10, 30, 2.5)], pose: 'combo1' } },
  };
}

function punchCombo(reach: number, dmg: number, slow = 1): Record<string, MoveDef> {
  return {
    combo1: { duration: 0.5 * slow, frames: [hit(0.18 * slow, 0.3 * slow, 4, reach, dmg, 'hit', 70)], pose: 'punch' },
    combo2: { duration: 0.7 * slow, frames: [hit(0.3 * slow, 0.45 * slow, 2, reach + 6, dmg, 'down', 110)], pose: 'punch2' },
    knee: { duration: 0.3, frames: [hit(0.08, 0.2, 4, 18, 1, 'hit', 0)] },
    throw: { duration: 0.6, frames: [] },
  };
}

function kickCombo(reach: number, dmg: number, slow = 1): Record<string, MoveDef> {
  return {
    combo1: { duration: 0.5 * slow, frames: [hit(0.16 * slow, 0.3 * slow, 4, reach, dmg, 'hit', 80)], pose: 'kick' },
    combo2: { duration: 0.7 * slow, frames: [hit(0.25 * slow, 0.45 * slow, 2, reach + 8, dmg, 'down', 130)], pose: 'kick', lunge: 60 },
    knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
  };
}

function whipCombo(reach: number, dmg: number, slow = 1): Record<string, MoveDef> {
  return {
    combo1: { duration: 0.6 * slow, frames: [hit(0.2 * slow, 0.34 * slow, 6, reach, dmg, 'hit', 90, 10, 30)], pose: 'lash' },
    combo2: { duration: 0.8 * slow, frames: [hit(0.3 * slow, 0.5 * slow, 4, reach + 6, dmg, 'down', 140, 10, 30)], pose: 'lash' },
    knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
  };
}

// ---------- palettes ----------

const skin = { skin: '#f0c090', skinDark: '#c89060' };
function pal(p: Partial<Palette>): Palette {
  return { ...skin, hair: '#402010', top: '#8080a0', topDark: '#505070', legs: '#604020', legsDark: '#402810', boots: '#302010', weapon: '#d0d8e0', weaponDark: '#707880', ...p };
}

const rig = (r: Partial<RigDef> & { palette: Palette }): RigDef => ({ scale: 1, weapon: 'none', head: 'bare', ...r });

// ---------- heroes ----------

const HEROES_BASE: Record<string, ActorDef> = {
  axel: {
    id: 'axel', name: 'AXEL', hp: 24, speed: 80, width: 16, height: 44, points: 0, grabbable: false, maxMagic: 3,
    rig: rig({ palette: pal({ hair: '#f0d060', top: '#f4f4f4', topDark: '#b8c0c8', legs: '#3060c0', legsDark: '#203c80', boots: '#f0f0f0' }), bulk: 0.4 , look: LOOKS.axel }),
    attacks: brawlerCombo(18, 2, 4), weaponAttacks: weaponMoves(2),
  },
  blaze: {
    id: 'blaze', name: 'BLAZE', hp: 24, speed: 92, width: 14, height: 42, points: 0, grabbable: false, maxMagic: 3,
    rig: rig({ palette: pal({ skin: '#f4d0a8', skinDark: '#d0a070', hair: '#7a3018', top: '#d83048', topDark: '#901828', legs: '#d83048', legsDark: '#901828', boots: '#d83048' }), slim: true, head: 'long' , look: LOOKS.blaze }),
    attacks: brawlerCombo(16, 2, 3, 0.85), weaponAttacks: weaponMoves(1, 0.85),
  },
  adam: {
    id: 'adam', name: 'ADAM', hp: 24, speed: 68, width: 18, height: 46, points: 0, grabbable: false, maxMagic: 3,
    rig: rig({ palette: pal({ skin: '#8a5a30', skinDark: '#5c3a1c', hair: '#201810', top: '#f0d040', topDark: '#b09020', legs: '#303038', legsDark: '#181820', boots: '#404048' }), bulk: 0.7 , look: LOOKS.adam }),
    attacks: brawlerCombo(20, 3, 5, 1.2), weaponAttacks: weaponMoves(3, 1.2),
  },
};

// ---------- regular enemies (named as in the Japanese manual) ----------

const GALSIA_JACKETS = ['#4060d0', '#d04040', '#40a040'];
function galsia(variant: number): ActorDef {
  const c = GALSIA_JACKETS[variant] ?? GALSIA_JACKETS[0];
  return {
    id: `galsia${variant}`, name: 'GALSIA', hp: 6 + variant * 2, speed: 60 + variant * 4, width: 16, height: 44, points: 500 + variant * 200, grabbable: true,
    rig: rig({ palette: pal({ top: c, topDark: '#283058', legs: '#303040', legsDark: '#181828', hair: '#301808', boots: '#202020' }) , look: LOOKS.galsia }),
    attacks: punchCombo(20, 2), ai: { range: 22, cooldown: 1.6, flank: 0.35, caution: 0.3, approach: 1, grabs: true },
  };
}

const DONOVAN_TOPS = ['#40a060', '#8040c0', '#a0a0a8'];
function donovan(variant: number): ActorDef {
  const c = DONOVAN_TOPS[variant] ?? DONOVAN_TOPS[0];
  return {
    id: `donovan${variant}`, name: 'DONOVAN', hp: 8 + variant * 3, speed: 52, width: 18, height: 46, points: 600 + variant * 200, grabbable: true,
    rig: rig({ palette: pal({ top: c, topDark: '#303048', legs: '#5060a0', legsDark: '#304070', hair: '#f0c090', boots: '#302010' }), bulk: 0.7 , look: LOOKS.donovan }),
    attacks: punchCombo(22, 3, 1.15), ai: { range: 24, cooldown: 1.9, flank: 0.25, caution: 0.15, approach: 0.9 },
  };
}

const SIGNAL_JACKETS = ['#c04080', '#4080c0'];
function signal(variant: number): ActorDef {
  const c = SIGNAL_JACKETS[variant] ?? SIGNAL_JACKETS[0];
  return {
    id: `signal${variant}`, name: 'Y. SIGNAL', hp: 7 + variant * 3, speed: 78, width: 16, height: 46, points: 700 + variant * 200, grabbable: true,
    rig: rig({ palette: pal({ top: c, topDark: '#402040', legs: '#202028', legsDark: '#101018', hair: variant ? '#f04040' : '#f0e040', boots: '#404040' }), head: 'mohawk' , look: LOOKS.signal }),
    attacks: {
      ...kickCombo(22, 2, 0.9),
      combo2: { duration: 0.75, frames: [hit(0.15, 0.5, 2, 26, 3, 'down', 150, 0, 20)], pose: 'slide', lunge: 220 },
    },
    ai: { range: 26, cooldown: 1.4, flank: 0.6, caution: 0.4, approach: 1.1 },
  };
}

function whipWoman(id: string, name: string, top: string, hair: string, hp: number, points: number): ActorDef {
  return {
    id, name, hp, speed: 70, width: 14, height: 42, points, grabbable: true,
    rig: rig({ palette: pal({ skin: '#f4d0a8', skinDark: '#d0a070', top, topDark: '#402040', legs: top, legsDark: '#402040', hair, boots: '#202020', weapon: '#806040', weaponDark: '#503818' }), slim: true, head: 'long', weapon: 'whip' , look: LOOKS.whip }),
    attacks: whipCombo(40, 3), ai: { range: 38, cooldown: 1.5, flank: 0.45, caution: 0.5, approach: 1 },
  };
}

const JACK_TOPS = ['#d0d0d0', '#e0a040'];
function jack(variant: number): ActorDef {
  const c = JACK_TOPS[variant] ?? JACK_TOPS[0];
  return {
    id: `jack${variant}`, name: 'JACK', hp: 6 + variant * 3, speed: 64, width: 16, height: 44, points: 600 + variant * 200, grabbable: true,
    rig: rig({ palette: pal({ top: c, topDark: '#707078', legs: '#404048', legsDark: '#202028', hair: '#f0c090', boots: '#202020', weapon: '#e0e8f0', weaponDark: '#604020' }), weapon: 'knife' , look: LOOKS.jack }),
    attacks: { ...punchCombo(18, 2), shoot: { duration: 0.4, frames: [], pose: 'shoot' } },
    ai: { range: 20, cooldown: 2.2, flank: 0.3, caution: 0.4, approach: 1, ranged: { range: 150, speed: 230, damage: 3, height: 18, kind: 'knife', move: 'shoot' } },
  };
}

const HAKUYO_GIS = ['#f4f4f4', '#60a0e0'];
function hakuyo(variant: number): ActorDef {
  const c = HAKUYO_GIS[variant] ?? HAKUYO_GIS[0];
  return {
    id: `hakuyo${variant}`, name: 'HAKUYO', hp: 8 + variant * 3, speed: 66, width: 16, height: 44, points: 800 + variant * 200, grabbable: true,
    rig: rig({ palette: pal({ top: c, topDark: '#9098a0', legs: c, legsDark: '#9098a0', hair: '#101010', boots: '#f0c090' }) , look: LOOKS.hakuyo }),
    attacks: { ...kickCombo(24, 3), jumpAttack: { duration: 0.5, frames: [hit(0.05, 0.4, 2, 28, 3, 'down', 120, 0, 40)], pose: 'jumpKick' } },
    ai: { range: 26, cooldown: 1.3, flank: 0.4, caution: 0.6, approach: 1.05 },
  };
}

// ---------- bosses ----------

const antonio: ActorDef = {
  id: 'antonio', name: 'ANTONIO', hp: 36, speed: 58, width: 18, height: 48, points: 5000, grabbable: false,
  rig: rig({ palette: pal({ top: '#8040a0', topDark: '#502070', legs: '#8040a0', legsDark: '#502070', hair: '#202020', boots: '#202020', weapon: '#e0c060', weaponDark: '#a08030' }), head: 'cap', weapon: 'boomerang', scale: 1.1 , look: LOOKS.antonio }),
  attacks: {
    combo1: { duration: 0.5, frames: [hit(0.18, 0.3, 4, 24, 3, 'hit', 80)], pose: 'punch' },
    combo2: { duration: 0.6, frames: [hit(0.2, 0.38, 2, 30, 4, 'down', 130)], pose: 'combo1' },
    shoot: { duration: 0.45, frames: [], pose: 'shoot' },
    knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
  },
  ai: { range: 26, cooldown: 1.6, flank: 0.3, caution: 0.3, approach: 1, armor: 1, ranged: { range: 170, speed: 210, damage: 3, height: 20, kind: 'boomerang', returns: true, mixed: true, move: 'shoot' } },
};

const souther: ActorDef = {
  id: 'souther', name: 'SOUTHER', hp: 40, speed: 86, width: 16, height: 46, points: 6000, grabbable: false,
  rig: rig({ palette: pal({ legs: '#c03030', legsDark: '#801818', hair: '#202020', boots: '#202020', weapon: '#e0e8f0', weaponDark: '#8090a0' }), bareChest: true, weapon: 'claws', scale: 1.05, bulk: 0.3 , look: LOOKS.souther }),
  attacks: {
    combo1: { duration: 0.4, frames: [hit(0.12, 0.26, 4, 26, 3, 'hit', 80)], pose: 'combo1' },
    combo2: { duration: 0.55, frames: [hit(0.1, 0.4, 2, 30, 4, 'down', 150)], pose: 'dashAttack', lunge: 150 },
    knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
  },
  ai: { range: 26, cooldown: 1.1, flank: 0.6, caution: 0.4, approach: 1.15, armor: 1 },
};

const abadede: ActorDef = {
  id: 'abadede', name: 'ABADEDE', hp: 50, speed: 54, width: 26, height: 60, points: 7000, grabbable: false,
  rig: rig({ palette: pal({ legs: '#3040c0', legsDark: '#202880', hair: '#f0e060', boots: '#f0f0f0' }), bareChest: true, head: 'long', scale: 1.3, bulk: 1.2 , look: LOOKS.abadede }),
  attacks: {
    combo1: { duration: 0.6, frames: [hit(0.2, 0.36, 4, 30, 4, 'hit', 90, 0, 50)], pose: 'punch' },
    combo2: { duration: 0.75, frames: [hit(0.15, 0.55, 2, 36, 5, 'down', 180, 0, 50)], pose: 'dashAttack', lunge: 240 },
    knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
  },
  ai: { range: 32, cooldown: 1.8, flank: 0.2, caution: 0.1, approach: 1, armor: 2, grabs: true },
};

const bongo: ActorDef = {
  id: 'bongo', name: 'BONGO', hp: 55, speed: 42, width: 30, height: 60, points: 8000, grabbable: false,
  rig: rig({ palette: pal({ skin: '#e0b080', skinDark: '#b08050', legs: '#c03030', legsDark: '#801818', hair: '#302010', boots: '#302010' }), bareChest: true, scale: 1.35, bulk: 2 , look: LOOKS.bongo }),
  attacks: {
    combo1: { duration: 0.8, frames: [hit(0.3, 0.5, 4, 36, 4, 'down', 150, 0, 50)], pose: 'punch' },
    breath: { duration: 0.9, frames: [], pose: 'breath' },
    knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
  },
  ai: { range: 36, cooldown: 2.4, flank: 0.1, caution: 0, approach: 0.9, armor: 2, ranged: { range: 120, speed: 130, damage: 4, height: 14, kind: 'flame', mixed: true, move: 'breath' } },
};

function twin(id: string, name: string, top: string): ActorDef {
  return {
    id, name, hp: 30, speed: 94, width: 14, height: 42, points: 4000, grabbable: false,
    rig: rig({ palette: pal({ skin: '#f4d0a8', skinDark: '#d0a070', top, topDark: '#402040', legs: top, legsDark: '#402040', hair: '#f0e060', boots: '#202020', weapon: '#806040', weaponDark: '#503818' }), slim: true, head: 'long', weapon: 'whip' , look: LOOKS.twin }),
    attacks: {
      ...whipCombo(42, 3, 0.8),
      combo3: { duration: 0.6, frames: [hit(0.1, 0.45, 2, 28, 4, 'down', 160, 0, 40)], pose: 'jumpKick', lunge: 200 },
    },
    ai: { range: 40, cooldown: 1.2, flank: 0.7, caution: 0.5, approach: 1.2, armor: 1 },
  };
}

const mrx: ActorDef = {
  id: 'mrx', name: 'MR. X', hp: 90, speed: 48, width: 20, height: 50, points: 20000, grabbable: false,
  rig: rig({ palette: pal({ top: '#303040', topDark: '#181820', legs: '#303040', legsDark: '#181820', hair: '#9098a0', boots: '#101010', weapon: '#c0c8d0', weaponDark: '#404048' }), weapon: 'gun', scale: 1.15, bulk: 0.4 , look: LOOKS.mrx }),
  attacks: {
    combo1: { duration: 0.6, frames: [hit(0.2, 0.38, 4, 30, 4, 'down', 140, 0, 50)], pose: 'combo1' },
    shoot: { duration: 0.5, frames: [], pose: 'shoot' },
    knee: { duration: 0.3, frames: [] }, throw: { duration: 0.6, frames: [] },
  },
  ai: { range: 28, cooldown: 1.7, flank: 0.2, caution: 0.1, approach: 0.9, armor: 3, ranged: { range: 230, speed: 330, damage: 3, height: 20, kind: 'bullet', burst: 3, mixed: true, move: 'shoot' } },
};

const ENEMIES_BASE: Record<string, ActorDef> = {
  galsia0: galsia(0), galsia1: galsia(1), galsia2: galsia(2),
  donovan0: donovan(0), donovan1: donovan(1), donovan2: donovan(2),
  signal0: signal(0), signal1: signal(1),
  nora: whipWoman('nora', 'NORA', '#f060a0', '#f0e060', 7, 700),
  electra: whipWoman('electra', 'ELECTRA', '#6040e0', '#202020', 10, 900),
  jack0: jack(0), jack1: jack(1),
  hakuyo0: hakuyo(0), hakuyo1: hakuyo(1),
  antonio, souther, abadede, bongo,
  mona: twin('mona', 'MONA', '#d02040'), lisa: twin('lisa', 'LISA', '#2060d0'),
  mrx,
};

export const BOSSES = ['antonio', 'souther', 'abadede', 'bongo', 'mona', 'lisa', 'mrx'] as const;

/** Weapons a hero can pick up from the floor (ids are rig shapes). */
export const WEAPONS = ['pipe', 'bat', 'knife', 'bottle', 'shaker'] as const;
export const WEAPON_NAMES: Record<string, string> = { pipe: 'CANO', bat: 'TACO', knife: 'FACA', bottle: 'GARRAFA', shaker: 'PIMENTA' };

/** sprites are drawn at cartridge size (heroes about 62 px tall): bodies and hit boxes follow */
export const SIZE = 1.4;
export const HEROES = scaleDefs(HEROES_BASE, SIZE);
export const ENEMIES = scaleDefs(ENEMIES_BASE, SIZE);
export const DEFS: Record<string, ActorDef> = { ...HEROES, ...ENEMIES };
