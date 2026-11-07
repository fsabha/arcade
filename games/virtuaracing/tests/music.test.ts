import { describe, expect, it } from 'vitest';
import { validateSong } from '@arcade/shared';
import { VR_SONG } from '../src/music';

describe('virtuaracing music', () => {
  it('every track fills its bars with valid notes', () => {
    expect(validateSong(VR_SONG)).toEqual([]);
  });
});
