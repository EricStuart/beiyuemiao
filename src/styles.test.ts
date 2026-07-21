import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('overlay visibility styles', () => {
  it('keeps the fatal overlay hidden until an error occurs', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toMatch(/\.fatal-error\[hidden\]\s*\{[^}]*display:\s*none/s);
  });
});
