import { describe, it, expect } from 'vitest';
import { gameSpec, GAME_NUMBERS } from '../src/games';

describe('game select matrix', () => {
  it('maps the manual: 1-8 hyperspace, 9-16 shields, 17-24 flip, 25-32 none; bonus 5000/10000/20000/none; odd slow, even fast', () => {
    expect(gameSpec(1)).toMatchObject({ special: 'hyperspace', bonus: 5000, fast: false });
    expect(gameSpec(2)).toMatchObject({ special: 'hyperspace', bonus: 5000, fast: true });
    expect(gameSpec(8)).toMatchObject({ special: 'hyperspace', bonus: null, fast: true });
    expect(gameSpec(9)).toMatchObject({ special: 'shields', bonus: 5000 });
    expect(gameSpec(20)).toMatchObject({ special: 'flip', bonus: 10000, fast: true });
    expect(gameSpec(31)).toMatchObject({ special: 'none', bonus: null, fast: false });
    expect(gameSpec(65)).toMatchObject({ special: 'hyperspace', bonus: 5000, fast: false, kids: true });
    expect(GAME_NUMBERS).toHaveLength(33);
  });
});
