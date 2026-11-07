import { describe, expect, it } from 'vitest';
import { validateSong } from '@arcade/shared';
import { SR_SONG } from '../src/music';

describe('streetsofrage music', () => {
  it('every track fills its bars with valid notes', () => {
    expect(validateSong(SR_SONG)).toEqual([]);
  });
});
