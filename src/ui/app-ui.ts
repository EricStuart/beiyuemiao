import {
  Box,
  Building2,
  Camera,
  CircleGauge,
  Columns3,
  Expand,
  Eye,
  Info,
  Layers3,
  Maximize2,
  MoonStar,
  Ruler,
  RotateCcw,
  Sun,
  X,
  createIcons,
} from 'lucide';
import { DENING_HALL } from '../data/building';
import type { InspectionLayer } from '../model/types';
import type { LightingMode } from '../runtime/viewer';
import type { ViewPreset } from '../runtime/view-presets';

export interface ViewerControls {
  setLayer: (layer: InspectionLayer) => void;
  setViewPreset: (preset: ViewPreset) => void;
  setLighting: (mode: LightingMode) => void;
  resetView: () => void;
  requestFullscreen: () => void;
}

export interface AppUI {
  setReady: () => void;
  showFatalError: (message: string) => void;
  showContextStatus: (status: 'lost' | 'restored') => void;
  dispose: () => void;
}

function iconButton(icon: string, label: string, attributes = ''): string {
  return `<button class="icon-button" type="button" aria-label="${label}" title="${label}" ${attributes}><i data-lucide="${icon}"></i></button>`;
}

export function createAppUI(root: HTMLElement, controls: ViewerControls): AppUI {
  root.innerHTML = `
    <header class="title-lockup" aria-label="建筑名称">
      <span>曲阳北岳庙</span>
      <h1>德宁之殿</h1>
      <p>现状建筑复原</p>
    </header>

    <button class="dimension-chip" type="button" data-action="dimensions" aria-expanded="false">
      <span>25.6 m</span><span class="chip-separator"></span><span>9 × 6</span>
    </button>

    <div class="dimension-guides" hidden aria-label="建筑尺寸">
      <div class="height-guide"><span>25.6 m</span></div>
      <div class="width-guide"><span>${DENING_HALL.planWidth.value.toFixed(2)} m · 测绘柱网</span></div>
    </div>

    <div class="tool-popover view-popover" data-popover="views" hidden>
      <div class="popover-label">观察视角</div>
      <div class="view-grid">
        <button type="button" data-view="front">正面</button>
        <button type="button" data-view="left">左侧</button>
        <button type="button" data-view="right">右侧</button>
        <button type="button" data-view="rear">背面</button>
        <button type="button" data-view="aerial">鸟瞰</button>
        <button type="button" data-view="reset">复位</button>
      </div>
    </div>

    <div class="tool-popover layer-popover" data-popover="layers" hidden>
      <div class="popover-label">结构分层</div>
      <div class="segment-control" role="group" aria-label="结构分层">
        <button type="button" class="is-active" data-layer="full">完整</button>
        <button type="button" data-layer="grid">柱网</button>
        <button type="button" data-layer="roof">屋顶</button>
        <button type="button" data-layer="brackets">斗栱</button>
      </div>
    </div>

    <nav class="tool-dock" aria-label="三维观察工具">
      ${iconButton('rotate-ccw', '复位视角', 'data-action="reset"')}
      ${iconButton('camera', '观察视角', 'data-action="views" aria-expanded="false"')}
      ${iconButton('layers-3', '结构分层', 'data-action="layers" aria-expanded="false"')}
      ${iconButton('ruler', '尺寸标注', 'data-action="dimensions" aria-expanded="false"')}
      ${iconButton('sun', '切换光照', 'data-action="lighting" data-mode="sunny"')}
      ${iconButton('info', '资料与依据', 'data-action="info" aria-expanded="false"')}
      ${iconButton('maximize-2', '全屏', 'data-action="fullscreen"')}
    </nav>

    <aside class="source-drawer" aria-hidden="true" aria-label="资料与依据">
      <div class="drawer-header">
        <div><span>资料与依据</span><h2>德宁之殿</h2></div>
        ${iconButton('x', '关闭资料面板', 'data-action="close-info"')}
      </div>
      <div class="drawer-scroll">
        <figure class="reference-figure">
          <img src="/reference/dening-hall-front.jpg" alt="用户提供的德宁之殿正面照片" />
          <figcaption>正立面参考 · 用户提供</figcaption>
        </figure>

        <section class="fact-section">
          <h3>建筑形制</h3>
          <dl class="facts">
            <div><dt>通高</dt><dd>25.6 m <span class="evidence documented">文献</span></dd></div>
            <div><dt>外观柱网</dt><dd>九间 × 六进 <span class="evidence documented">文献</span></dd></div>
            <div><dt>殿身</dt><dd>七间 × 四进 <span class="evidence secondary">建筑史</span></dd></div>
            <div><dt>屋顶</dt><dd>重檐庑殿顶 <span class="evidence documented">文献</span></dd></div>
            <div><dt>柱网</dt><dd>${DENING_HALL.planWidth.value.toFixed(2)} × ${DENING_HALL.planDepth.value.toFixed(2)} m <span class="evidence secondary">测绘</span></dd></div>
            <div><dt>主台基</dt><dd>${DENING_HALL.platformWidth.value.toFixed(2)} × ${DENING_HALL.platformDepth.value.toFixed(2)} m <span class="evidence secondary">测绘</span></dd></div>
            <div><dt>前出月台</dt><dd>${DENING_HALL.terraceWidth.value.toFixed(2)} × ${DENING_HALL.terraceDepth.value.toFixed(2)} m <span class="evidence secondary">测绘</span></dd></div>
          </dl>
        </section>

        <section class="fact-section confidence-note">
          <h3>尺寸说明</h3>
          <p>通高与间数采用公开文物资料。主台基、前出月台和外檐柱网总跨度采用用户提供的平面测绘摘录；逐间柱距仍按测绘总跨度与九间六进对称权重换算。</p>
        </section>

        <section class="fact-section">
          <h3>公开来源</h3>
          <ul class="source-list">
            ${DENING_HALL.sources
              .filter((source) => !source.url.startsWith('/'))
              .map((source) => `<li><a href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a><span>${source.kind === 'documented' ? '文献' : source.kind === 'secondary' ? '测绘' : '图像'}</span></li>`)
              .join('')}
          </ul>
        </section>

        <section class="fact-section model-stats">
          <h3>模型状态</h3>
          <p><i data-lucide="circle-gauge"></i><span data-diagnostics>正在读取...</span></p>
        </section>
      </div>
    </aside>

    <div class="loading-screen" role="status"><span></span><p>正在构建德宁之殿</p></div>
    <div class="context-toast" role="status" hidden></div>
    <div class="fatal-error" role="alert" hidden>
      <i data-lucide="building-2"></i>
      <h2>三维场景无法启动</h2>
      <p data-error-message></p>
    </div>
  `;

  createIcons({
    icons: {
      Box,
      Building2,
      Camera,
      CircleGauge,
      Columns3,
      Expand,
      Eye,
      Info,
      Layers3,
      Maximize2,
      MoonStar,
      Ruler,
      RotateCcw,
      Sun,
      X,
    },
    attrs: { 'stroke-width': 1.7 },
  });

  const drawer = root.querySelector<HTMLElement>('.source-drawer');
  const loading = root.querySelector<HTMLElement>('.loading-screen');
  const fatal = root.querySelector<HTMLElement>('.fatal-error');
  const errorMessage = root.querySelector<HTMLElement>('[data-error-message]');
  const contextToast = root.querySelector<HTMLElement>('.context-toast');
  const dimensions = root.querySelector<HTMLElement>('.dimension-guides');
  const diagnostics = root.querySelector<HTMLElement>('[data-diagnostics]');
  let lighting: LightingMode = 'sunny';

  const closePopovers = (except?: string): void => {
    root.querySelectorAll<HTMLElement>('[data-popover]').forEach((popover) => {
      if (popover.dataset.popover !== except) {
        popover.hidden = true;
        root.querySelector<HTMLButtonElement>(`[data-action="${popover.dataset.popover}"]`)?.setAttribute('aria-expanded', 'false');
      }
    });
  };

  const togglePopover = (name: string): void => {
    const popover = root.querySelector<HTMLElement>(`[data-popover="${name}"]`);
    if (!popover) return;
    const willOpen = popover.hidden;
    closePopovers(name);
    popover.hidden = !willOpen;
    root.querySelector<HTMLButtonElement>(`[data-action="${name}"]`)?.setAttribute('aria-expanded', String(willOpen));
  };

  const clickHandler = (event: Event): void => {
    const target = event.target as Element;
    const button = target.closest<HTMLButtonElement>('button');
    if (!button) return;

    const view = button.dataset.view as ViewPreset | undefined;
    if (view) {
      controls.setViewPreset(view);
      closePopovers();
      return;
    }

    const layer = button.dataset.layer as InspectionLayer | undefined;
    if (layer) {
      controls.setLayer(layer);
      root.querySelectorAll('[data-layer]').forEach((item) => item.classList.toggle('is-active', item === button));
      return;
    }

    switch (button.dataset.action) {
      case 'reset':
        controls.resetView();
        break;
      case 'views':
      case 'layers':
        togglePopover(button.dataset.action);
        break;
      case 'dimensions': {
        if (!dimensions) break;
        dimensions.hidden = !dimensions.hidden;
        root.querySelectorAll<HTMLButtonElement>('[data-action="dimensions"]').forEach((item) => {
          item.setAttribute('aria-expanded', String(!dimensions.hidden));
        });
        break;
      }
      case 'lighting':
        lighting = lighting === 'sunny' ? 'survey' : 'sunny';
        controls.setLighting(lighting);
        button.dataset.mode = lighting;
        button.setAttribute('aria-label', lighting === 'sunny' ? '切换到中性测绘光照' : '切换到晴天光照');
        break;
      case 'info':
        closePopovers();
        drawer?.classList.add('is-open');
        drawer?.setAttribute('aria-hidden', 'false');
        button.setAttribute('aria-expanded', 'true');
        if (diagnostics && window.__DENING_DIAGNOSTICS__) {
          const data = window.__DENING_DIAGNOSTICS__;
          diagnostics.textContent = `${data.quality.toUpperCase()} · ${data.calls} 次绘制 · ${data.triangles.toLocaleString()} 三角形`;
        }
        break;
      case 'close-info':
        drawer?.classList.remove('is-open');
        drawer?.setAttribute('aria-hidden', 'true');
        root.querySelector<HTMLButtonElement>('[data-action="info"]')?.setAttribute('aria-expanded', 'false');
        break;
      case 'fullscreen':
        controls.requestFullscreen();
        break;
    }
  };

  root.addEventListener('click', clickHandler);

  return {
    setReady: () => loading?.classList.add('is-hidden'),
    showFatalError: (message: string) => {
      loading?.classList.add('is-hidden');
      if (errorMessage) errorMessage.textContent = message;
      if (fatal) fatal.hidden = false;
    },
    showContextStatus: (status) => {
      if (!contextToast) return;
      contextToast.textContent = status === 'lost' ? '图形上下文已中断，正在恢复' : '三维场景已恢复';
      contextToast.hidden = false;
      window.setTimeout(() => {
        contextToast.hidden = true;
      }, 2600);
    },
    dispose: () => root.removeEventListener('click', clickHandler),
  };
}
