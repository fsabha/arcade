/** The cartridge's game select matrix for one player (manual CX2649). Game 65 is the children's game. */
export type Special = 'hyperspace' | 'shields' | 'flip' | 'none';
export interface GameSpec {
  number: number;
  special: Special;
  bonus: number | null; // points per extra ship
  fast: boolean;
  kids: boolean;
}

const SPECIALS: Special[] = ['hyperspace', 'shields', 'flip', 'none'];
const BONUSES: (number | null)[] = [5000, 10000, 20000, null];

export const GAME_NUMBERS: number[] = [...Array.from({ length: 32 }, (_, i) => i + 1), 65];

export function gameSpec(n: number): GameSpec {
  if (n === 65) return { number: 65, special: 'hyperspace', bonus: 5000, fast: false, kids: true };
  const i = n - 1; // 0..31
  return {
    number: n,
    special: SPECIALS[Math.floor(i / 8)],
    bonus: BONUSES[Math.floor((i % 8) / 2)],
    fast: i % 2 === 1,
    kids: false,
  };
}

export const SPECIAL_NAMES: Record<Special, string> = {
  hyperspace: 'HIPERESPACO',
  shields: 'ESCUDO',
  flip: 'FLIP',
  none: 'SEM EXTRA',
};
