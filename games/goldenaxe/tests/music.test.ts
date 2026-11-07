import { describe, expect, it } from 'vitest';
import { validateSong } from '@arcade/shared';
import { GA_SONG } from '../src/music';

describe('goldenaxe music', () => {
  it('every track fills its bars with valid notes', () => {
    expect(validateSong(GA_SONG)).toEqual([]);
  });
});
