/** The eight cartridge variations from the Activision manual (AG-009). */

export interface LaneSpec {
  truck: boolean;
  speed: number; // px/s
  count: number; // vehicles in the lane (the 2600 drew 1-3 copies)
}

export interface GameSpec {
  n: number;
  name: string;
  place: string;
  time: string;
  random: boolean; // games 5-8: speeds change at random
  /** lanes indexed by distance from the curb: 1 = curb lane ... 5 = centre lane; `upper` is for lanes 6-10 */
  lower: LaneSpec[];
  upper: LaneSpec[];
}

const car = (speed: number, count = 1): LaneSpec => ({ truck: false, speed, count });
const truck = (speed: number, count = 1): LaneSpec => ({ truck: true, speed, count });

const TRUCK_FAST = 96;

function base(n: number): Pick<GameSpec, 'lower' | 'upper'> {
  switch (((n - 1) % 4) + 1) {
    case 1: {
      // Automobiles only, thin, slow; slowest at the curbs, faster toward the centre.
      const l = [car(26), car(36), car(46), car(56), car(66)];
      return { lower: l, upper: l.map((x) => ({ ...x })) };
    }
    case 2: {
      // Thicker and faster; the upper lane closest to the centre has trucks.
      const l = [car(34, 2), car(46, 2), car(58), car(70), car(82)];
      const u = [car(34, 2), car(46, 2), car(58), car(70), truck(82)];
      return { lower: l, upper: u };
    }
    case 3: {
      // Trucks in both centre lanes, the fastest vehicles; thicker traffic in the two curb lanes.
      const l = [car(36, 3), car(48, 3), car(60, 2), car(72, 2), truck(TRUCK_FAST)];
      return { lower: l, upper: l.map((x) => ({ ...x })) };
    }
    default: {
      // Trucks everywhere: curb and centre lanes fast, lanes 2/4 half, lane 3 a quarter.
      const l = [truck(TRUCK_FAST), truck(TRUCK_FAST / 2), truck(TRUCK_FAST / 4), truck(TRUCK_FAST / 2), truck(TRUCK_FAST)];
      return { lower: l, upper: l.map((x) => ({ ...x })) };
    }
  }
}

const META: [string, string, string][] = [
  ['LAKE SHORE DRIVE', 'CHICAGO', '3 AM'],
  ['INTERSTATE 5', 'SEATTLE', '6 AM'],
  ['SANTA MONICA FWY', 'LOS ANGELES', '10 AM'],
  ['BAYSHORE FREEWAY', 'SAN FRANCISCO', 'MEIA-NOITE'],
  ['JOHN LODGE EXPWY', 'DETROIT', '9 PM'],
  ['THE BELTWAY', 'WASHINGTON DC', '6 PM'],
  ['LBJ FREEWAY', 'DALLAS', '5 PM'],
  ['LONG ISLAND EXPWY', 'NEW YORK', '3 AM'],
];

export function gameSpec(n: number): GameSpec {
  const k = Math.max(1, Math.min(8, n));
  const [name, place, time] = META[k - 1];
  return { n: k, name, place, time, random: k >= 5, ...base(k) };
}

export type Difficulty = 'A' | 'B';
