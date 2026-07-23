export const NATURAL_LIGHT_CYCLE_MS = 90_000;

export interface NaturalLightState {
  phase: number;
  position: { x: number; y: number; z: number };
  intensity: number;
  fillIntensity: number;
  color: number;
}

function mixChannel(start: number, end: number, amount: number): number {
  return Math.round(start + (end - start) * amount);
}

function mixHex(start: number, end: number, amount: number): number {
  const red = mixChannel((start >> 16) & 0xff, (end >> 16) & 0xff, amount);
  const green = mixChannel((start >> 8) & 0xff, (end >> 8) & 0xff, amount);
  const blue = mixChannel(start & 0xff, end & 0xff, amount);
  return (red << 16) | (green << 8) | blue;
}

export function evaluateNaturalLightCycle(elapsedMs: number): NaturalLightState {
  const wrapped = ((elapsedMs % NATURAL_LIGHT_CYCLE_MS) + NATURAL_LIGHT_CYCLE_MS)
    % NATURAL_LIGHT_CYCLE_MS;
  const phase = wrapped / NATURAL_LIGHT_CYCLE_MS;
  const angle = phase * Math.PI * 2;
  const daylight = 0.5 + Math.sin(angle) * 0.5;

  return {
    phase,
    position: {
      x: Math.cos(angle) * 72,
      y: 42 + daylight * 20,
      z: Math.sin(angle) * 58,
    },
    intensity: 3 + daylight * 0.9,
    fillIntensity: 2.05 + daylight * 0.45,
    color: mixHex(0xffd6a0, 0xfff3d8, daylight),
  };
}
