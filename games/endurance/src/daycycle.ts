export type Phase = 'dawn' | 'day' | 'ice' | 'dusk' | 'night' | 'fog';

export type Rgb = [number, number, number];

export interface Conditions {
  phase: Phase;
  sky: Rgb;
  skyLow: Rgb; // colour near the horizon
  grass: Rgb;
  grass2: Rgb;
  road: Rgb;
  edge: Rgb;
  fogColor: Rgb;
  fogDensity: number; // larger = thicker (exponential fog)
  dark: number; // 0 = full daylight, 1 = only lights visible
  icy: number; // 0..1 slipperiness
}

const PALETTE: Record<Phase, Omit<Conditions, 'phase'>> = {
  dawn: {
    sky: [60, 46, 110], skyLow: [232, 128, 70], grass: [44, 108, 44], grass2: [38, 94, 38],
    road: [82, 82, 86], edge: [230, 230, 230], fogColor: [232, 150, 90], fogDensity: 3, dark: 0.1, icy: 0,
  },
  day: {
    sky: [60, 132, 226], skyLow: [138, 196, 240], grass: [64, 156, 64], grass2: [54, 136, 54],
    road: [110, 110, 112], edge: [240, 240, 240], fogColor: [150, 200, 240], fogDensity: 2, dark: 0, icy: 0,
  },
  ice: {
    sky: [190, 212, 236], skyLow: [228, 236, 244], grass: [232, 238, 246], grass2: [214, 224, 236],
    road: [196, 208, 222], edge: [120, 140, 170], fogColor: [228, 236, 244], fogDensity: 4, dark: 0, icy: 1,
  },
  dusk: {
    sky: [48, 28, 78], skyLow: [214, 86, 56], grass: [36, 84, 36], grass2: [30, 72, 30],
    road: [70, 68, 74], edge: [220, 210, 200], fogColor: [120, 60, 60], fogDensity: 4, dark: 0.35, icy: 0,
  },
  night: {
    sky: [4, 5, 14], skyLow: [10, 12, 30], grass: [8, 20, 8], grass2: [6, 16, 6],
    road: [22, 22, 26], edge: [90, 90, 96], fogColor: [2, 2, 6], fogDensity: 12, dark: 1, icy: 0,
  },
  fog: {
    sky: [184, 190, 198], skyLow: [196, 200, 206], grass: [140, 160, 140], grass2: [128, 148, 128],
    road: [132, 132, 134], edge: [200, 200, 200], fogColor: [192, 196, 202], fogDensity: 55, dark: 0.1, icy: 0,
  },
};

interface Key {
  t: number; // fraction of the day where this phase is fully in effect
  phase: Phase;
}

export const hasFog = (day: number): boolean => day >= 2;
export const hasIce = (day: number): boolean => day >= 3;

/** Keyframes for a day; the phase holds until the next key, blending across BLEND. */
export function timeline(day: number): Key[] {
  const keys: Key[] = [
    { t: 0.0, phase: 'dawn' },
    { t: 0.1, phase: 'day' },
  ];
  if (hasIce(day)) {
    keys.push({ t: 0.4, phase: 'ice' });
    keys.push({ t: 0.54, phase: 'day' });
  }
  keys.push({ t: 0.6, phase: 'dusk' });
  keys.push({ t: 0.68, phase: 'night' });
  if (hasFog(day)) keys.push({ t: 0.84, phase: 'fog' });
  return keys;
}

const BLEND = 0.035; // fraction of the day spent cross-fading between phases

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
}

function mix(a: Omit<Conditions, 'phase'>, b: Omit<Conditions, 'phase'>, t: number): Omit<Conditions, 'phase'> {
  return {
    sky: lerpRgb(a.sky, b.sky, t),
    skyLow: lerpRgb(a.skyLow, b.skyLow, t),
    grass: lerpRgb(a.grass, b.grass, t),
    grass2: lerpRgb(a.grass2, b.grass2, t),
    road: lerpRgb(a.road, b.road, t),
    edge: lerpRgb(a.edge, b.edge, t),
    fogColor: lerpRgb(a.fogColor, b.fogColor, t),
    fogDensity: lerp(a.fogDensity, b.fogDensity, t),
    dark: lerp(a.dark, b.dark, t),
    icy: lerp(a.icy, b.icy, t),
  };
}

/** Conditions at fraction `f` (0..1) of the given day. */
export function conditionsAt(f: number, day: number): Conditions {
  const keys = timeline(day);
  const t = Math.min(0.999999, Math.max(0, f));
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
  const cur = keys[i];
  const next = keys[i + 1];
  // the first phase of the next day is dawn; blend into it near the end
  const nextPhase: Phase = next ? next.phase : 'dawn';
  const nextT = next ? next.t : 1;
  const blendStart = nextT - BLEND;
  if (t >= blendStart) {
    const k = (t - blendStart) / BLEND;
    return { phase: k < 0.5 ? cur.phase : nextPhase, ...mix(PALETTE[cur.phase], PALETTE[nextPhase], k) };
  }
  return { phase: cur.phase, ...PALETTE[cur.phase] };
}

export function css(c: Rgb): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Exponential fog amount (0 = clear, 1 = fully hidden) for a normalised distance 0..1. */
export function fogAmount(d: number, density: number): number {
  return 1 - 1 / Math.exp(d * d * density);
}
