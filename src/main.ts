import './styles.css';
import { currentDeviceProfile, selectQuality } from './runtime/capabilities';
import { DeningHallViewer } from './runtime/viewer';
import { createAppUI } from './ui/app-ui';

export const APP_TITLE = '德宁之殿';

const uiRoot = document.querySelector<HTMLDivElement>('#ui');
const canvas = document.querySelector<HTMLCanvasElement>('#scene');

if (uiRoot && canvas) {
  let viewer: DeningHallViewer | undefined;
  const ui = createAppUI(uiRoot, {
    setLayer: (layer) => viewer?.setLayer(layer),
    setViewPreset: (preset) => viewer?.setViewPreset(preset),
    setLighting: (mode) => viewer?.setLighting(mode),
    resetView: () => viewer?.resetView(),
    requestFullscreen: () => {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
      else void document.exitFullscreen?.();
    },
  });

  try {
    viewer = new DeningHallViewer(canvas, selectQuality(currentDeviceProfile()));
    canvas.addEventListener('dening-context-status', (event) => {
      const status = (event as CustomEvent<'lost' | 'restored'>).detail;
      ui.showContextStatus(status);
    });
    viewer.start();
    void viewer.whenReady().then(() => ui.setReady());
  } catch (error) {
    console.error('Failed to start Dening Hall viewer', error);
    const message = error instanceof Error && error.message.trim()
      ? error.message
      : '当前浏览器无法创建 WebGL 场景。';
    ui.showFatalError(message);
  }
}
