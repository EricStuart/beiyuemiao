export interface RoofProfileOptions {
  run: number;
  rise: number;
  eaveLift: number;
}

export interface RoofProfilePoint {
  x: number;
  y: number;
}

function validateRoofProfile(options: RoofProfileOptions): void {
  const { run, rise, eaveLift } = options;
  if (!Number.isFinite(run) || run <= 0) throw new Error('Roof run must be positive');
  if (!Number.isFinite(rise) || rise <= eaveLift) throw new Error('Roof rise must exceed eave lift');
}

export function evaluateRaisedEaveHeight(options: RoofProfileOptions, t: number): number {
  validateRoofProfile(options);
  if (!Number.isFinite(t) || t < 0 || t > 1) throw new Error('Roof profile ratio must be between zero and one');

  const easedRise = 0.18 * t + 0.82 * t * t;
  return options.eaveLift + (options.rise - options.eaveLift) * easedRise;
}

export function evaluateWingLift(positionRatio: number, t: number, maxLift = 0.72): number {
  const edge = Math.max(0, (Math.abs(positionRatio) - 0.64) / 0.36);
  return edge * edge * (1 - t) * maxLift;
}

export function sampleRaisedEaveProfile(options: RoofProfileOptions, segments: number): RoofProfilePoint[] {
  const { run } = options;
  validateRoofProfile(options);
  if (!Number.isInteger(segments) || segments < 2) throw new Error('Roof segments must be at least two');

  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    return {
      x: run * t,
      y: evaluateRaisedEaveHeight(options, t),
    };
  });
}
