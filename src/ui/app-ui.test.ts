import { describe, expect, it, vi } from 'vitest';
import { createAppUI, type ViewerControls } from './app-ui';

describe('application UI', () => {
  it('sends the grid layer selection to the viewer', () => {
    const root = document.createElement('div');
    const controls: ViewerControls = {
      setLayer: vi.fn(),
      setViewPreset: vi.fn(),
      setLighting: vi.fn(),
      resetView: vi.fn(),
      requestFullscreen: vi.fn(),
    };
    createAppUI(root, controls);

    const gridButton = root.querySelector<HTMLButtonElement>('[data-layer="grid"]');
    gridButton?.click();

    expect(controls.setLayer).toHaveBeenCalledTimes(1);
    expect(controls.setLayer).toHaveBeenCalledWith('grid');
  });

  it('closes tool popovers before opening the source drawer', () => {
    const root = document.createElement('div');
    const controls: ViewerControls = {
      setLayer: vi.fn(),
      setViewPreset: vi.fn(),
      setLighting: vi.fn(),
      resetView: vi.fn(),
      requestFullscreen: vi.fn(),
    };
    createAppUI(root, controls);
    root.querySelector<HTMLButtonElement>('[data-action="layers"]')?.click();
    const layerPopover = root.querySelector<HTMLElement>('[data-popover="layers"]');
    expect(layerPopover?.hidden).toBe(false);

    root.querySelector<HTMLButtonElement>('[data-action="info"]')?.click();

    expect(layerPopover?.hidden).toBe(true);
  });
});
