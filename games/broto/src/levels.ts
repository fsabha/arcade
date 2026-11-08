/**
 * The ten stages of BROTO (design: Lúcio). Gate y is the position along the lane: 0 at the Dry
 * Heart, 1 at the Sower. The horde grows about 1.4x per stage; `rate` lets the rest of it out over
 * roughly half the target time.
 */
import type { LevelDef, GateDef } from './world';

const dew = (n: number, x: number, y: number, w = 0.34): GateDef => ({ op: 'add', n, x, y, w });
const root = (x: number, y: number, w = 0.4): GateDef => ({ op: 'mul', n: 2, x, y, w });
const bloom = (x: number, y: number, w = 0.22): GateDef => ({ op: 'mul', n: 3, x, y, w });
const thorn = (n: number, x: number, y: number, w = 0.32): GateDef => ({ op: 'sub', n, x, y, w });
const frost = (x: number, y: number, w = 0.4): GateDef => ({ op: 'div', n: 2, x, y, w });
const wind = (x: number, y: number, phase = 0, w = 0.3): GateDef => ({ op: 'mul', n: 2, x, y, w, amp: 0.3, speed: (Math.PI * 2) / 3, phase });
const well = (x: number, y: number, w = 0.56): GateDef => ({ op: 'well', n: 5, x, y, w });

const pace = (horde: number, opening: number, par: number) => (horde - opening) / (par * 0.38);

export const LEVELS: LevelDef[] = [
  { name: 'PRIMEIRO ORVALHO', par: 45, horde: 150, opening: 18, rate: pace(150, 18, 45), foeSpeed: 0.1, heartHp: 100,
    gates: [dew(5, 0.5, 0.78, 0.5), root(0.5, 0.52, 0.6)] },
  { name: 'RAÍZES', par: 50, horde: 250, opening: 30, rate: pace(250, 30, 50), foeSpeed: 0.11, heartHp: 180,
    gates: [root(0.27, 0.55, 0.42), dew(10, 0.73, 0.55, 0.42), dew(5, 0.5, 0.82, 0.4)] },
  { name: 'ESPINHEIRO', par: 55, horde: 400, opening: 48, rate: pace(400, 48, 55), foeSpeed: 0.11, heartHp: 300,
    gates: [thorn(20, 0.2, 0.52), bloom(0.5, 0.52), thorn(20, 0.8, 0.52), dew(5, 0.5, 0.82, 0.4), root(0.5, 0.7, 0.5)] },
  { name: 'VENTANIA', par: 60, horde: 550, opening: 66, rate: pace(550, 66, 60), foeSpeed: 0.12, heartHp: 450,
    gates: [dew(8, 0.5, 0.84, 0.4), wind(0.5, 0.66, 0), wind(0.5, 0.46, 0.9)] },
  { name: 'GEADA', par: 65, horde: 800, opening: 96, rate: pace(800, 96, 65), foeSpeed: 0.12, heartHp: 700, embers: 0.1, surge: 150,
    gates: [dew(8, 0.5, 0.86, 0.4), root(0.27, 0.68, 0.42), frost(0.73, 0.68, 0.42), frost(0.27, 0.48, 0.42), root(0.73, 0.48, 0.42)] },
  { name: "OLHO-D'ÁGUA", par: 70, horde: 1100, opening: 132, rate: pace(1100, 132, 70), foeSpeed: 0.13, heartHp: 1000, embers: 0.12,
    gates: [dew(10, 0.5, 0.86, 0.4), { ...thorn(40, 0.5, 0.7, 0.3), amp: 0.3, speed: 1.6 }, well(0.5, 0.5)] },
  { name: 'PEDREGAL', par: 75, horde: 1300, opening: 160, rate: pace(1300, 160, 75) * 0.8, foeSpeed: 0.13, heartHp: 1400, embers: 0.15,
    stones: [{ x: 0.35, y: 0.3, w: 0.05, h: 0.5 }, { x: 0.65, y: 0.3, w: 0.05, h: 0.5 }],
    gates: [root(0.17, 0.6, 0.26), thorn(30, 0.5, 0.65, 0.26), bloom(0.5, 0.42, 0.26), frost(0.83, 0.6, 0.26), dew(12, 0.83, 0.72, 0.26), dew(6, 0.5, 0.88, 0.5)] },
  { name: 'NOITE SEM LUA', par: 80, horde: 1900, opening: 228, rate: pace(1900, 228, 80), foeSpeed: 0.14, heartHp: 1800, embers: 0.15, dark: true,
    gates: [dew(10, 0.5, 0.86, 0.4), root(0.3, 0.68, 0.4), frost(0.72, 0.68, 0.4), thorn(25, 0.2, 0.45), bloom(0.5, 0.45), thorn(25, 0.8, 0.45)] },
  { name: 'QUEIMADA', par: 85, horde: 2200, opening: 220, rate: pace(2200, 220, 85) * 0.6, foeSpeed: 0.15, heartHp: 2400, embers: 0.35,
    gates: [dew(10, 0.5, 0.86, 0.4), { ...root(0.3, 0.7, 0.42), uses: 350 }, { ...bloom(0.7, 0.52, 0.26), uses: 350 }, { ...well(0.5, 0.34, 0.5), uses: 350 }] },
  { name: 'O CORAÇÃO SECO', par: 90, horde: 3200, opening: 250, rate: pace(3200, 250, 90) * 0.75, foeSpeed: 0.15, heartHp: 3600, embers: 0.25, stages: 3, stageWave: 300,
    gates: [dew(10, 0.5, 0.88, 0.4), root(0.27, 0.72, 0.42), frost(0.73, 0.72, 0.42), wind(0.5, 0.55, 0), well(0.5, 0.38, 0.5), { ...thorn(40, 0.5, 0.22, 0.3), amp: 0.32, speed: 1.3 }] },
];

/** Gifts offered between stages (pick one of three). */
export type GiftId = 'seiva' | 'casca' | 'polen' | 'raiz' | 'brotacao' | 'orvalho';
export const GIFTS: Record<GiftId, { name: string; text: string }> = {
  seiva: { name: 'SEIVA', text: '+15% de sementes por segundo' },
  casca: { name: 'CASCA', text: '10% de chance da semente sobreviver ao choque' },
  polen: { name: 'PÓLEN', text: 'portões de Orvalho valem o dobro' },
  raiz: { name: 'RAIZ FUNDA', text: 'começa a fase com 30 sementes na trilha' },
  brotacao: { name: 'BROTAÇÃO', text: 'a Muda fica pronta 30% mais rápido' },
  orvalho: { name: 'ORVALHO FRESCO', text: 'recupera 1 pétala' },
};
