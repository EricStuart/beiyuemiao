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
  const lateral = Math.sin(phase * Math.PI * 2);
  const angle = Math.PI / 2 + lateral * ((Math.PI * 25) / 180);
  const frontness = Math.cos(lateral * Math.PI / 2);

  return {
    phase,
    position: {
      x: Math.cos(angle) * 62,
      y: 60 + frontness * 2,
      z: Math.sin(angle) * 62,
    },
    intensity: 3.05 + frontness * 0.25,
    fillIntensity: 1.65 + frontness * 0.2,
    color: mixHex(0xffdfb0, 0xfff3d8, frontness),
  };
}
