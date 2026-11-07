export const W = 320;
export const H = 224;

export const HUD_H = 28;
/** walkable band of the floor, in screen px */
export const FLOOR_TOP = 150;
export const FLOOR_BOTTOM = 212;

export const START_LIVES = 3;
export const CONTINUES = 3;
/** health is counted in bars like the cartridge: 3 at normal, 5 at easy */
export const HEALTH_NORMAL = 3;
export const HEALTH_EASY = 5;
/** a hero loses its remaining bar points per hit; 1 bar = this many points */
export const BAR = 4;

export type Difficulty = 'easy' | 'normal' | 'hard';

export const HERO_IDS = ['ax', 'tyris', 'gilius'] as const;
export type HeroId = (typeof HERO_IDS)[number];

export const HERO_NAMES: Record<HeroId, string> = { ax: 'AX BATTLER', tyris: 'TYRIS FLARE', gilius: 'GILIUS THUNDERHEAD' };
/** magic pots each hero can carry: Ax 4, Tyris 6, Gilius 3 (Mega Drive) */
export const MAX_POTS: Record<HeroId, number> = { ax: 4, tyris: 6, gilius: 3 };
export const MAGIC_NAMES: Record<HeroId, string> = { ax: 'TERRA', tyris: 'FOGO', gilius: 'RAIO' };
/** damage of the magic per pot spent, by hero: lightning strongest per pot, fire weakest per pot but 6 pots */
export const MAGIC_DAMAGE: Record<HeroId, number> = { ax: 3, tyris: 2.5, gilius: 4 };

export const STAGE_INTRO_TIME = 2.4;
export const CAMP_TIME = 9;
export const DEATH_TIME = 2.0;
export const CLEAR_TIME = 3.0;

export const POINTS = { thief: 0, potBonus: 100, stageClear: 1000, foodHeal: BAR } as const;

export function healthFor(d: Difficulty): number {
  return (d === 'easy' ? HEALTH_EASY : HEALTH_NORMAL) * BAR;
}

export function enemyScale(d: Difficulty): number {
  return d === 'easy' ? 0.8 : d === 'hard' ? 1.35 : 1;
}
