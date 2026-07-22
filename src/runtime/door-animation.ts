import { MathUtils } from 'three';
import type { DoorLeafBinding } from '../model/doors';

const CYCLE_MS = 14_000;

function smoothstep(value: number): number {
  const t = MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export function evaluateDoorCycle(timeMs: number, phaseMs = 0): number {
  const time = ((timeMs + phaseMs) % CYCLE_MS + CYCLE_MS) % CYCLE_MS;
  if (time < 2000) return 0;
  if (time < 4500) return smoothstep((time - 2000) / 2500);
  if (time < 8000) return 1;
  if (time < 10500) return 1 - smoothstep((time - 8000) / 2500);
  return 0;
}

export class DoorAnimationController {
  constructor(private readonly targets: { front: DoorLeafBinding[]; rear: DoorLeafBinding[] }) {}

  update(timeMs: number): void {
    this.apply(this.targets.front, evaluateDoorCycle(timeMs));
    this.apply(this.targets.rear, evaluateDoorCycle(timeMs, 2500));
  }

  private apply(leaves: DoorLeafBinding[], openness: number): void {
    leaves.forEach(({ pivot, closedRotationY, openRotationY }) => {
      pivot.rotation.y = MathUtils.lerp(closedRotationY, openRotationY, openness);
    });
  }
}
