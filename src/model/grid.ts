import type { BuildingData } from '../data/building';

export function createAxisCoordinates(weights: readonly number[], totalLength?: number): number[] {
  if (weights.length === 0 || weights.some((weight) => !Number.isFinite(weight) || weight <= 0)) {
    throw new Error('Axis weights must contain positive finite values');
  }

  const rawTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const scale = (totalLength ?? rawTotal) / rawTotal;
  const coordinates = [-((totalLength ?? rawTotal) / 2)];

  for (const weight of weights) {
    const previous = coordinates.at(-1);
    coordinates.push((previous ?? 0) + weight * scale);
  }

  return coordinates;
}

export function createBayCenters(coordinates: readonly number[]): number[] {
  return coordinates.slice(0, -1).map((coordinate, index) => {
    const next = coordinates[index + 1];
    if (next === undefined) throw new Error('Axis coordinates must be contiguous');
    return (coordinate + next) / 2;
  });
}

export function validateBuildingData(data: BuildingData): void {
  if (data.facadeBays !== 9 || data.bayWidths.length !== 9) {
    throw new Error('Dening Hall requires nine facade bays');
  }
  if (data.depthBays !== 6 || data.depthWidths.length !== 6) {
    throw new Error('Dening Hall requires six depth bays');
  }

  const sourcedValues = [
    data.totalHeight,
    data.footprintArea,
    data.planWidth,
    data.planDepth,
    data.platformWidth,
    data.platformDepth,
    data.terraceWidth,
    data.terraceDepth,
    data.corridorColumnHeight,
    data.upperColumnHeight,
  ];
  if (sourcedValues.some(({ value }) => !Number.isFinite(value) || value <= 0)) {
    throw new Error('All sourced dimensions must be positive finite numbers');
  }
  if (data.upperRidgeHeight !== data.totalHeight.value) {
    throw new Error('Upper ridge height must match the documented total height');
  }
}
