export const W = 320;
export const H = 224;
export const HORIZON = 96; // screen y of the horizon at level ground
export const FOCAL = 180; // projection focal length (px per unit at distance 1)
export const NEAR = 1.0; // metres
export const DRAW_AHEAD = 70; // track samples drawn ahead of the camera
export const DRAW_BEHIND = 6;

export const TRACK_W = 14; // metres, road width
export const SAMPLE = 8; // metres between track samples
export const CARS = 16; // 15 opponents + you
export const LAPS = 5; // every course in the arcade is five laps

export const MAX_SPEED = 290 / 3.6; // m/s (about 290 km/h top speed)
export const ACCEL = 24; // m/s^2 at low speed
export const BRAKE = 42;
export const DRAG = 0.0032; // v^2 drag
export const GRASS_SPEED = 120 / 3.6; // speed the grass lets you keep
export const GRASS_DRAG = 14;
export const STEER_RATE = 10; // lateral m/s at full lock and full speed
export const WALL = TRACK_W / 2 + 6; // metres from the centre where the barrier is
export const GEARS = 7;

export type Course = 'bigforest' | 'baybridge' | 'acropolis';
export const COURSES: Course[] = ['bigforest', 'baybridge', 'acropolis'];
export const COURSE_NAMES: Record<Course, string> = { bigforest: 'BIG FOREST', baybridge: 'BAY BRIDGE', acropolis: 'ACROPOLIS' };
export const COURSE_LEVEL: Record<Course, string> = { bigforest: 'INICIANTE', baybridge: 'MEDIO', acropolis: 'EXPERT' };

export type Mode = 'arcade' | 'gp' | 'free';
export const MODE_NAMES: Record<Mode, string> = { arcade: 'ARCADE', gp: 'GRAND PRIX', free: 'TREINO' };

/** Arcade mode: seconds on the clock at the start and at every checkpoint (two per lap). */
export const START_TIME: Record<Course, number> = { bigforest: 62, baybridge: 60, acropolis: 58 };
export const CHECKPOINT_TIME: Record<Course, number> = { bigforest: 30, baybridge: 30, acropolis: 29 };

export const COUNTDOWN = 3.6;
export const FINISH_TIME = 6;

export const VIEWS = 4; // the VR button: bumper, close chase, far chase, helicopter

export function gearFor(speed: number): number {
  const k = speed / MAX_SPEED;
  return Math.max(1, Math.min(GEARS, Math.ceil(k * GEARS)));
}

/** Leaderboard points: laps done, finishing position and time saved against a reference. */
export function raceScore(lapsDone: number, position: number | null, time: number, course: Course, finished: boolean): number {
  let s = lapsDone * 1000;
  if (finished && position !== null) {
    const ref = { bigforest: 220, baybridge: 240, acropolis: 260 }[course];
    s += (CARS - position) * 1500 + Math.max(0, Math.round((ref - time) * 20));
  }
  return s;
}
