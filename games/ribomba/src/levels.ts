/** The eight canyons (design: Lúcio) and the gifts between them. */
import type { LevelDef, TrialKind } from './world';

const NAMES = ['AREIAL', 'CURVA DO S', 'PEDREGULHO', 'TORRE', 'VENTANIA', 'NEBLINA', 'GARGANTA', 'TRONO DE AREIA'];
const TRIALS: TrialKind[][] = [
  ['golden'],
  ['rapids', 'golden'],
  ['avalanche'],
  ['bridge', 'golden'],
  ['ambush', 'giant'],
  ['fog', 'avalanche'],
  ['twin', 'rapids'],
  ['avalanche', 'giant'],
];
// river size, reds per second, march speed, gates and crates per stage
const CURVE: [number, number, number, [number, number], [number, number], [number, number], number][] = [
  [300, 4.5, 0.13, [2, 3], [8, 15], [8, 40], 0.2],
  [800, 11, 0.17, [3, 4], [12, 25], [15, 60], 0.25],
  [1300, 15, 0.18, [3, 5], [15, 30], [20, 90], 0.3],
  [1900, 20, 0.19, [4, 6], [20, 40], [40, 150], 0.35],
  [2600, 26, 0.2, [5, 8], [25, 50], [60, 220], 0.35],
  [3400, 32, 0.21, [6, 10], [30, 60], [90, 300], 0.4],
  [4300, 39, 0.22, [8, 12], [40, 80], [120, 400], 0.45],
  [5400, 46, 0.23, [10, 15], [50, 100], [150, 500], 0.5],
];

export const LEVELS: LevelDef[] = CURVE.map(([river, rate, foeSpeed, muls, adds, box, trap], k) => ({
  name: NAMES[k],
  river, rate, foeSpeed,
  riverW: k >= 6 ? 0.3 : 0.26,
  shift: [Math.max(4, 8 - k * 0.5), Math.max(6, 11 - k * 0.6)],
  muls, adds, box, trap,
  slide: k >= 2,
  boss: k,
  warn: 1.2 - k * 0.07,
  trials: TRIALS[k],
  look: k,
  par: 60 + k * 10,
}));

export type GiftId = 'vida' | 'duplo' | 'caixas' | 'portao' | 'aviso' | 'lento' | 'fraco';
export const GIFTS: Record<GiftId, { name: string; text: string }> = {
  vida: { name: 'VIDA EXTRA', text: '+1 vida (máx. 4)' },
  duplo: { name: 'CANO DUPLO', text: 'mais um cano agora' },
  caixas: { name: 'CAIXAS FRÁGEIS', text: 'caixas −25%' },
  portao: { name: 'PORTÃO DOBRADO', text: 'o 1º portão × de cada fase vale o dobro' },
  aviso: { name: 'OLHO DE SENTINELA', text: 'avisos dos ataques +0,2 s' },
  lento: { name: 'AREIA FOFA', text: 'o rio vermelho 10% mais lento' },
  fraco: { name: 'MIRA FINA', text: '+50% de dano no ponto fraco' },
};
