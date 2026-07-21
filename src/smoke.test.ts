import { describe, expect, it } from 'vitest';
import { APP_TITLE } from './main';

describe('application shell', () => {
  it('uses the Dening Hall title', () => {
    expect(APP_TITLE).toBe('德宁之殿');
  });
});
