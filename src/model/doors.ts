import { BoxGeometry, Group, Mesh, type Material } from 'three';

export interface DoorLeafBinding {
  pivot: Group;
  closedRotationY: number;
  openRotationY: number;
}

export interface DoorPairResult {
  group: Group;
  leaves: [DoorLeafBinding, DoorLeafBinding];
}

export interface DoorPairOptions {
  side: 'front' | 'rear';
  bay: number;
  left: number;
  right: number;
  z: number;
  platformTop: number;
  height: number;
  material: Material;
  timberMaterial: Material;
}

export function createDoorPair(options: DoorPairOptions): DoorPairResult {
  const group = new Group();
  group.name = `${options.side === 'front' ? '正门' : '后门'}第${options.bay + 1}间`;
  group.userData.kind = 'door-pair';
  group.userData.side = options.side;
  group.userData.bay = options.bay;

  const openingWidth = options.right - options.left - 0.16;
  const centreGap = 0.08;
  const leafWidth = (openingWidth - centreGap) / 2;
  const openingAngle = Math.PI * 0.42;

  const createLeaf = (role: 'left' | 'right'): DoorLeafBinding => {
    const pivot = new Group();
    const isLeft = role === 'left';
    const pivotX = isLeft ? options.left + 0.08 : options.right - 0.08;
    pivot.position.set(pivotX, options.platformTop, options.z);
    pivot.userData.kind = 'door-leaf-pivot';
    pivot.userData.side = options.side;
    pivot.userData.bay = options.bay;
    pivot.userData.role = role;

    const leaf = new Mesh(
      new BoxGeometry(leafWidth, options.height, 0.18),
      options.material,
    );
    leaf.name = `${role === 'left' ? '左' : '右'}门扇`;
    leaf.userData.kind = 'door-leaf';
    leaf.userData.side = options.side;
    leaf.userData.bay = options.bay;
    leaf.userData.role = role;
    leaf.position.set(isLeft ? leafWidth / 2 : -leafWidth / 2, options.height / 2, 0);

    for (const yRatio of [0.18, 0.5, 0.82]) {
      const rail = new Mesh(
        new BoxGeometry(leafWidth + 0.04, 0.14, 0.24),
        options.timberMaterial,
      );
      rail.position.set(0, options.height * (yRatio - 0.5), 0.04);
      leaf.add(rail);
    }
    for (const xRatio of [-0.25, 0.25]) {
      const stile = new Mesh(
        new BoxGeometry(0.12, options.height - 0.18, 0.24),
        options.timberMaterial,
      );
      stile.position.set(leafWidth * xRatio, 0, 0.04);
      leaf.add(stile);
    }

    pivot.add(leaf);
    group.add(pivot);
    const inwardSign = options.side === 'front' ? -1 : 1;
    const leafSign = isLeft ? -1 : 1;
    return {
      pivot,
      closedRotationY: 0,
      openRotationY: openingAngle * inwardSign * leafSign,
    };
  };

  return { group, leaves: [createLeaf('left'), createLeaf('right')] };
}
