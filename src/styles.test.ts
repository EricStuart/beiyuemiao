import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('overlay visibility styles', () => {
  it('keeps the fatal overlay hidden until an error occurs', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toMatch(/\.fatal-error\[hidden\]\s*\{[^}]*display:\s*none/s);
  });

  it('hands mobile touch gestures directly to the full-screen 3D canvas', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toMatch(/body\s*,?[\s\S]*overscroll-behavior:\s*none/);
    expect(css).toMatch(/#scene\s*\{[^}]*touch-action:\s*none/s);
    expect(css).toContain('-webkit-text-size-adjust: 100%');
  });
});
