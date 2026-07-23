import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  MathUtils,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDeningHall } from '../model/create-dening-hall';
import type { InspectionLayer, QualityLevel } from '../model/types';
import { DoorAnimationController } from './door-animation';
import { evaluateNaturalLightCycle } from './natural-light-cycle';
import { ORBIT_CONTROL_LIMITS } from './orbit-config';
import { createViewPresets, type ViewPreset } from './view-presets';

export type LightingMode = 'sunny' | 'survey';

export interface ViewerDiagnostics {
  quality: QualityLevel;
  frames: number;
  calls: number;
  triangles: number;
  canvasVariance: number;
  sunPhase: number;
  sunPosition: { x: number; y: number; z: number };
}

declare global {
  interface Window {
    __DENING_DIAGNOSTICS__?: ViewerDiagnostics;
  }
}

export class DeningHallViewer {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly diagnostics: ViewerDiagnostics;

  private readonly building;
  private readonly doorAnimation: DoorAnimationController;
  private readonly sunnyLight: DirectionalLight;
  private readonly fillLight: HemisphereLight;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly walkPlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly readyPromise: Promise<void>;
  private resolveReady: (() => void) | undefined;
  private frameHandle = 0;
  private running = false;
  private firstFrame = true;
  private lightingMode: LightingMode = 'sunny';
  private lightCycleStart: number | undefined;
  private viewAnimation: { start: number; from: Vector3; to: Vector3; targetFrom: Vector3; targetTo: Vector3 } | undefined;

  constructor(private readonly canvas: HTMLCanvasElement, quality: QualityLevel) {
    this.readyPromise = new Promise<void>((resolve) => {
      this.resolveReady = resolve;
    });

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: quality !== 'low',
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = quality !== 'low';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.5));

    this.scene = new Scene();
    this.scene.background = new Color(0xa9c4c3);
    this.scene.fog = new Fog(0xa9c4c3, 105, 190);

    this.camera = new PerspectiveCamera(38, 1, 0.1, 400);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.minDistance = 18;
    this.controls.maxDistance = 155;
    this.controls.minPolarAngle = ORBIT_CONTROL_LIMITS.minPolarAngle;
    this.controls.maxPolarAngle = ORBIT_CONTROL_LIMITS.maxPolarAngle;
    this.controls.target.set(0, 10, 0);

    this.building = createDeningHall(quality);
    this.doorAnimation = new DoorAnimationController(this.building.doors);
    this.scene.add(this.building.root);

    this.fillLight = new HemisphereLight(0xd8e8e2, 0x5d5848, 2.25);
    this.sunnyLight = new DirectionalLight(0xfff0d1, 3.6);
    this.sunnyLight.position.set(-42, 66, 48);
    this.sunnyLight.castShadow = quality !== 'low';
    const shadowSize = quality === 'high' ? 2048 : 1024;
    this.sunnyLight.shadow.mapSize.set(shadowSize, shadowSize);
    this.sunnyLight.shadow.camera.left = -62;
    this.sunnyLight.shadow.camera.right = 62;
    this.sunnyLight.shadow.camera.top = 55;
    this.sunnyLight.shadow.camera.bottom = -35;
    this.scene.add(this.fillLight, this.sunnyLight, new AmbientLight(0x6d766f, 0.32));

    const initialAspect = Math.max(0.35, (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight));
    const presets = createViewPresets(
      this.building.metrics.width,
      this.building.metrics.depth,
      this.building.metrics.height,
      initialAspect,
    );
    this.camera.position.copy(presets.front.position);
    this.controls.target.copy(presets.front.target);
    this.controls.update();

    this.diagnostics = {
      quality,
      frames: 0,
      calls: 0,
      triangles: 0,
      canvasVariance: 0,
      sunPhase: 0,
      sunPosition: { x: -42, y: 66, z: 48 },
    };
    window.__DENING_DIAGNOSTICS__ = this.diagnostics;
    this.resize();
    window.addEventListener('resize', this.resize);
    canvas.addEventListener('dblclick', this.handleGroundMove);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.frameHandle = requestAnimationFrame(this.renderFrame);
  }

  setViewPreset(preset: ViewPreset): void {
    const poses = createViewPresets(
      this.building.metrics.width,
      this.building.metrics.depth,
      this.building.metrics.height,
      this.camera.aspect,
    );
    const pose = poses[preset];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.camera.position.copy(pose.position);
      this.controls.target.copy(pose.target);
      this.controls.update();
      return;
    }
    this.viewAnimation = {
      start: performance.now(),
      from: this.camera.position.clone(),
      to: pose.position,
      targetFrom: this.controls.target.clone(),
      targetTo: pose.target,
    };
  }

  resetView(): void {
    this.setViewPreset('reset');
  }

  setLayer(layer: InspectionLayer): void {
    const foundations = this.building.root.children[0];
    const grid = this.building.layers.get('grid');
    const roofs = this.building.layers.get('roof');
    const brackets = this.building.layers.get('brackets');
    if (!foundations || !grid || !roofs || !brackets) return;

    foundations.visible = layer === 'full' || layer === 'grid';
    grid.visible = layer === 'full' || layer === 'grid' || layer === 'brackets';
    roofs.visible = layer === 'full' || layer === 'roof';
    brackets.visible = layer === 'full' || layer === 'brackets';
  }

  setLighting(mode: LightingMode): void {
    this.lightingMode = mode;
    if (mode === 'survey') {
      this.scene.background = new Color(0xd2d1c8);
      this.scene.fog = new Fog(0xd2d1c8, 120, 210);
      this.sunnyLight.position.set(-42, 66, 48);
      this.sunnyLight.intensity = 2.25;
      this.sunnyLight.color.set(0xffffff);
      this.fillLight.intensity = 3.1;
      this.diagnostics.sunPosition = { x: -42, y: 66, z: 48 };
    } else {
      this.scene.background = new Color(0xa9c4c3);
      this.scene.fog = new Fog(0xa9c4c3, 105, 190);
      this.applyNaturalLight(performance.now());
    }
  }

  readonly resize = (): void => {
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('dblclick', this.handleGroundMove);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.controls.dispose();
    this.building.dispose();
    this.renderer.dispose();
    delete window.__DENING_DIAGNOSTICS__;
  }

  private readonly handleGroundMove = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const point = new Vector3();
    if (!this.raycaster.ray.intersectPlane(this.walkPlane, point)) return;
    point.x = MathUtils.clamp(point.x, -68, 68);
    point.z = MathUtils.clamp(point.z, -58, 72);
    const offset = this.camera.position.clone().sub(this.controls.target);
    this.controls.target.copy(point).setY(4.5);
    this.camera.position.copy(this.controls.target).add(offset);
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    this.canvas.dispatchEvent(new CustomEvent('dening-context-status', { detail: 'lost' }));
  };

  private readonly handleContextRestored = (): void => {
    this.canvas.dispatchEvent(new CustomEvent('dening-context-status', { detail: 'restored' }));
    this.start();
  };

  private applyNaturalLight(time: number): void {
    this.lightCycleStart ??= time;
    const state = evaluateNaturalLightCycle(time - this.lightCycleStart);
    this.sunnyLight.position.set(state.position.x, state.position.y, state.position.z);
    this.sunnyLight.intensity = state.intensity;
    this.sunnyLight.color.set(state.color);
    this.fillLight.intensity = state.fillIntensity;
    this.diagnostics.sunPhase = state.phase;
    this.diagnostics.sunPosition = { ...state.position };
  }

  private readonly renderFrame = (time: number): void => {
    if (!this.running) return;
    if (this.viewAnimation) {
      const progress = MathUtils.clamp((time - this.viewAnimation.start) / 850, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.camera.position.lerpVectors(this.viewAnimation.from, this.viewAnimation.to, eased);
      this.controls.target.lerpVectors(this.viewAnimation.targetFrom, this.viewAnimation.targetTo, eased);
      if (progress >= 1) this.viewAnimation = undefined;
    }
    if (this.lightingMode === 'sunny') this.applyNaturalLight(time);
    this.doorAnimation.update(time);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.diagnostics.frames += 1;
    this.diagnostics.calls = this.renderer.info.render.calls;
    this.diagnostics.triangles = this.renderer.info.render.triangles;

    if (this.firstFrame) {
      this.firstFrame = false;
      const gl = this.renderer.getContext();
      const pixel = new Uint8Array(4);
      gl.readPixels(Math.floor(this.canvas.width / 2), Math.floor(this.canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      this.diagnostics.canvasVariance = Math.max(...pixel) - Math.min(...pixel);
      this.resolveReady?.();
      this.resolveReady = undefined;
    }
    this.frameHandle = requestAnimationFrame(this.renderFrame);
  };
}
