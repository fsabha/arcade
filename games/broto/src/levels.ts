/**
 * The ten stages of BROTO (design: Lúcio, v2). Each one is a horde with a few trials in the middle
 * and a guardian at the end (boss.ts). Gate y is the position along the lane: 0 at the top, 1 at
 * the Sower. The horde is smaller than in v1: the guardian is the climax now.
 */
import type { LevelDef, GateDef } from './world';

const dew = (n: number, x: number, y: number, w = 0.34): GateDef => ({ op: 'add', n, x, y, w });
const root = (x: number, y: number, w = 0.4): GateDef => ({ op: 'mul', n: 2, x, y, w });
const bloom = (x: number, y: number, w = 0.22): GateDef => ({ op: 'mul', n: 3, x, y, w });
const thorn = (n: number, x: number, y: number, w = 0.32): GateDef => ({ op: 'sub', n, x, y, w });
const frost = (x: number, y: number, w = 0.4): GateDef => ({ op: 'div', n: 2, x, y, w });
const wind = (x: number, y: number, phase = 0, w = 0.3): GateDef => ({ op: 'mul', n: 2, x, y, w, amp: 0.3, speed: (Math.PI * 2) / 3, phase });
const well = (x: number, y: number, w = 0.56): GateDef => ({ op: 'well', n: 5, x, y, w });

/** horde, speed, embers, telegraph, hit — Lúcio's curve */
const CURVE: [number, number, number, number, number][] = [
  [120, 0.11, 0, 1.2, 8], [200, 0.12, 0, 1.1, 8], [300, 0.13, 0.05, 1.0, 10], [380, 0.14, 0.08, 0.95, 10], [480, 0.15, 0.12, 0.9, 12],
  [600, 0.16, 0.15, 0.85, 12], [620, 0.17, 0.18, 0.8, 15], [560, 0.18, 0.15, 0.7, 15], [780, 0.19, 0.22, 0.65, 15], [850, 0.2, 0.2, 0.6, 15],
];
const stage = (k: number, name: string, gates: GateDef[], trials: LevelDef['trials'], extra: Partial<LevelDef> = {}): LevelDef => {
  const [horde, foeSpeed, embers, warn, hit] = CURVE[k];
  const opening = Math.round(horde * 0.15);
  return { name, gates, trials, horde, opening, rate: (horde - opening) / 32, foeSpeed, embers, warn, hit, boss: k, par: 75 + k * 6, ...extra };
};

export const LEVELS: LevelDef[] = [
  stage(0, 'PRIMEIRO ORVALHO', [dew(5, 0.5, 0.78, 0.5), root(0.5, 0.52, 0.6)], ['golden']),
  stage(1, 'RAÍZES', [root(0.27, 0.55, 0.42), dew(10, 0.73, 0.55, 0.42), dew(5, 0.5, 0.82, 0.4)], ['golden']),
  stage(2, 'ESPINHEIRO', [thorn(20, 0.2, 0.52), bloom(0.5, 0.52), thorn(20, 0.8, 0.52), dew(5, 0.5, 0.82, 0.4), root(0.5, 0.7, 0.5)], ['protect', 'golden']),
  stage(3, 'VENTANIA', [dew(8, 0.5, 0.84, 0.4), wind(0.5, 0.66, 0), wind(0.5, 0.46, 0.9)], ['flank', 'golden']),
  stage(4, 'GEADA', [dew(8, 0.5, 0.86, 0.4), root(0.27, 0.68, 0.42), frost(0.73, 0.68, 0.42), frost(0.2, 0.48, 0.3), root(0.5, 0.48, 0.3), frost(0.8, 0.48, 0.3)], ['embers', 'golden']),
  stage(5, "OLHO-D'ÁGUA", [dew(10, 0.5, 0.86, 0.4), { ...thorn(40, 0.5, 0.7, 0.3), amp: 0.3, speed: 1.6 }, well(0.5, 0.5)], ['protect', 'race']),
  stage(6, 'PEDREGAL', [root(0.17, 0.6, 0.26), thorn(30, 0.5, 0.65, 0.26), bloom(0.5, 0.42, 0.26), frost(0.83, 0.6, 0.26), dew(12, 0.83, 0.72, 0.26), dew(6, 0.5, 0.9, 0.5)], ['drought', 'avalanche', 'race'],
    { stones: [{ x: 0.35, y: 0.3, w: 0.05, h: 0.5 }, { x: 0.65, y: 0.3, w: 0.05, h: 0.5 }] }),
  stage(7, 'NOITE SEM LUA', [dew(10, 0.5, 0.86, 0.4), root(0.3, 0.68, 0.4), frost(0.72, 0.68, 0.4), thorn(25, 0.2, 0.45), bloom(0.5, 0.45), thorn(25, 0.8, 0.45)], ['eclipse', 'flank', 'embers'], { dark: true }),
  stage(8, 'QUEIMADA', [dew(10, 0.5, 0.86, 0.4), { ...root(0.3, 0.7, 0.42), uses: 350 }, { ...bloom(0.7, 0.52, 0.26), uses: 350 }, { ...well(0.5, 0.34, 0.5), uses: 350 }], ['protect', 'avalanche', 'embers']),
  stage(9, 'O CORAÇÃO SECO', [dew(10, 0.5, 0.88, 0.4), root(0.27, 0.72, 0.42), frost(0.73, 0.72, 0.42), wind(0.5, 0.55, 0), well(0.5, 0.38, 0.5)], ['eclipse', 'race', 'avalanche']),
];

/** Gifts offered between stages (pick one of three). */
export type GiftId = 'seiva' | 'casca' | 'polen' | 'raiz' | 'brotacao' | 'orvalho' | 'cerne';
export const GIFTS: Record<GiftId, { name: string; text: string }> = {
  seiva: { name: 'SEIVA', text: '+15% de sementes por segundo' },
  casca: { name: 'CASCA', text: '10% de chance da semente sobreviver ao choque' },
  polen: { name: 'PÓLEN', text: 'portões de Orvalho valem o dobro' },
  raiz: { name: 'RAIZ FUNDA', text: 'começa a fase com 30 sementes na trilha' },
  brotacao: { name: 'BROTAÇÃO', text: 'a Muda fica pronta 30% mais rápido' },
  orvalho: { name: 'ORVALHO FRESCO', text: 'recupera 1 pétala' },
  cerne: { name: 'CERNE', text: '+30 de seiva máxima' },
};
