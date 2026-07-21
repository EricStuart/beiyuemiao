export interface RoofProfileOptions {
  run: number;
  rise: number;
  eaveLift: number;
}

export interface RoofProfilePoint {
  x: number;
  y: number;
}

export function sampleRaisedEaveProfile(options: RoofProfileOptions, segments: number): RoofProfilePoint[] {
  const { run, rise, eaveLift } = options;
  if (!Number.isFinite(run) || run <= 0) throw new Error('Roof run must be positive');
  if (!Number.isFinite(rise) || rise <= eaveLift) throw new Error('Roof rise must exceed eave lift');
  if (!Number.isInteger(segments) || segments < 2) throw new Error('Roof segments must be at least two');

  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const easedRise = 0.18 * t + 0.82 * t * t;
    return {
      x: run * t,
      y: eaveLift + (rise - eaveLift) * easedRise,
    };
  });
}
