/**
 * The 17 one-player variations of CX2638 (games 18-34 are the two-player twins).
 * Game select matrix: games alternate slow/fast target control; pairs alternate dumb/smart cruise
 * missiles; every block of four starts at a later wave (1, 7, 11, 15). Game 17 is the children's game.
 */
export interface GameSpec {
  number: number;
  fastCursor: boolean;
  smartCruise: boolean;
  firstWave: number;
  children: boolean;
}

export const FIRST_WAVES = [1, 7, 11, 15];
export const CHILDREN_GAME = 17;
export const GAME_NUMBERS = Array.from({ length: 17 }, (_, i) => i + 1);

export function gameSpec(n: number): GameSpec {
  if (n === CHILDREN_GAME) return { number: n, fastCursor: false, smartCruise: false, firstWave: 1, children: true };
  const i = n - 1;
  return {
    number: n,
    fastCursor: i % 2 === 1,
    smartCruise: i % 4 >= 2,
    firstWave: FIRST_WAVES[Math.floor(i / 4)],
    children: false,
  };
}

export function describeGame(s: GameSpec): string {
  if (s.children) return 'CRIANCAS';
  return `${s.fastCursor ? 'MIRA RAPIDA' : 'MIRA LENTA'} ${s.smartCruise ? 'CRUZEIRO ESPERTO' : 'CRUZEIRO BURRO'} ONDA ${s.firstWave}`;
}
