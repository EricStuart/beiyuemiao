import { describe, expect, it } from 'vitest';
import { createViewPresets } from './view-presets';

describe('view presets', () => {
  it('keeps the full platform in the aerial frame', () => {
    const presets = createViewPresets(52.8, 38.06, 25.6);
    expect(presets.aerial.position.distanceTo(presets.aerial.target)).toBeGreaterThan(95);
  });

  it('moves the front camera back on narrow mobile viewports', () => {
    const desktop = createViewPresets(52.8, 38.06, 25.6, 16 / 9).front;
    const mobile = createViewPresets(52.8, 38.06, 25.6, 390 / 844).front;
    expect(mobile.position.distanceTo(mobile.target)).toBeGreaterThan(
      desktop.position.distanceTo(desktop.target) * 1.7,
    );
    expect(mobile.position.y).toBeGreaterThan(desktop.position.y * 1.15);
  });
});
