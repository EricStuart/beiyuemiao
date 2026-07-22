import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { DoorAnimationController, evaluateDoorCycle } from './door-animation';

describe('automatic door cycle', () => {
  it('holds closed, opens, holds open, and closes within fourteen seconds', () => {
    expect(evaluateDoorCycle(0)).toBe(0);
    expect(evaluateDoorCycle(2000)).toBe(0);
    expect(evaluateDoorCycle(4500)).toBeCloseTo(1, 5);
    expect(evaluateDoorCycle(8000)).toBe(1);
    expect(evaluateDoorCycle(10500)).toBeCloseTo(0, 5);
    expect(evaluateDoorCycle(14000)).toBe(0);
  });

  it('keeps all front leaves synchronized while rear leaves use an offset phase', () => {
    const frontA = { pivot: new Group(), closedRotationY: 0, openRotationY: 1 };
    const frontB = { pivot: new Group(), closedRotationY: 0, openRotationY: -1 };
    const rear = { pivot: new Group(), closedRotationY: 0, openRotationY: 1 };
    const controller = new DoorAnimationController({ front: [frontA, frontB], rear: [rear] });
    controller.update(3500);
    expect(Math.abs(frontA.pivot.rotation.y)).toBeCloseTo(Math.abs(frontB.pivot.rotation.y), 5);
    expect(rear.pivot.rotation.y).not.toBeCloseTo(frontA.pivot.rotation.y, 5);
  });
});
