export const W = 320;
export const H = 224;

export const HUD_H = 28;
/** walkable band of the floor, in screen px */
export const FLOOR_TOP = 150;
export const FLOOR_BOTTOM = 212;

export const START_LIVES = 3;
export const CONTINUES = 3;
/** the health bar: one long bar of this many points (the cartridge's bar has 12 segments) */
export const HERO_HP = 24;
export const BAR_SEGMENTS = 12;
/** every life starts with one police call */
export const SPECIALS_PER_LIFE = 1;
export const MAX_SPECIALS = 3;
/** the napalm hits every enemy on screen for this much */
export const SPECIAL_DAMAGE = 10;

export type Difficulty = 'easy' | 'normal' | 'hard';

export const HERO_IDS = ['axel', 'blaze', 'adam'] as const;
export type HeroId = (typeof HERO_IDS)[number];

export const HERO_NAMES: Record<HeroId, string> = { axel: 'AXEL', blaze: 'BLAZE', adam: 'ADAM' };
export const HERO_FULL_NAMES: Record<HeroId, string> = { axel: 'AXEL HUNTER', blaze: 'BLAZE FIELDING', adam: 'ADAM HUNTER' };

export const ROUND_INTRO_TIME = 2.4;
export const DEATH_TIME = 2.0;
export const CLEAR_TIME = 3.0;
/** the police car drives in, then the napalm lands */
export const POLICE_TIME = 1.6;
export const POLICE_BLAST_AT = 0.85;

export const POINTS = { roundClear: 1000, apple: 0, chicken: 0, moneyBag: 1000, goldBar: 5000 } as const;
/** food: the apple heals a third of the bar, the chicken heals everything */
export const APPLE_HEAL = 8;
export const CHICKEN_HEAL = HERO_HP;

export function enemyScale(d: Difficulty): number {
  return d === 'easy' ? 0.75 : d === 'hard' ? 1.35 : 1;
}

export function difficultyName(d: Difficulty): string {
  return d === 'easy' ? 'FACIL' : d === 'hard' ? 'DIFICIL' : 'NORMAL';
}
