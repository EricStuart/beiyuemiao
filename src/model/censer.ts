import {
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import type { BuildingData } from '../data/building';
import type { BuildingMaterials } from './materials';

function mark(mesh: Mesh, kind: string): Mesh {
  mesh.userData.kind = kind;
  mesh.userData.materialRole = 'white-stone';
  return mesh;
}

export function createTerraceCenser(
  data: BuildingData,
  materials: BuildingMaterials,
): Group {
  const censer = new Group();
  censer.name = '月台白石道教香炉鼎';
  censer.userData.kind = 'terrace-censer';

  const belly = mark(new Mesh(new LatheGeometry([
    new Vector2(0.38, 0.55),
    new Vector2(0.72, 0.62),
    new Vector2(1.02, 0.82),
    new Vector2(1.10, 1.08),
    new Vector2(0.98, 1.38),
    new Vector2(0.68, 1.62),
  ], 32), materials.stone), 'censer-belly');
  censer.add(belly);

  const rim = mark(new Mesh(new TorusGeometry(0.7, 0.11, 10, 32), materials.stone), 'censer-rim');
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.66;
  censer.add(rim);

  const mouthMaterial = materials.stone.clone();
  mouthMaterial.color.multiplyScalar(0.68);
  mouthMaterial.name = '香炉口深色石材';
  const mouth = mark(new Mesh(new CylinderGeometry(0.56, 0.6, 0.07, 28), mouthMaterial), 'censer-mouth');
  mouth.userData.materialRole = 'recessed-stone';
  mouth.position.y = 1.67;
  censer.add(mouth);

  const lid = mark(new Mesh(
    new SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.stone,
  ), 'censer-lid');
  lid.position.y = 1.72;
  censer.add(lid);

  const finialBase = mark(new Mesh(new TorusGeometry(0.17, 0.055, 8, 18), materials.stone), 'censer-finial');
  finialBase.rotation.x = Math.PI / 2;
  finialBase.position.y = 2.11;
  const finial = mark(new Mesh(new SphereGeometry(0.13, 14, 10), materials.stone), 'censer-finial');
  finial.scale.set(0.8, 1.35, 0.8);
  finial.position.y = 2.17;
  censer.add(finialBase, finial);

  for (let index = 0; index < 3; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 3;
    const leg = mark(new Mesh(
      new CylinderGeometry(0.15, 0.22, 0.68, 10),
      materials.stone,
    ), 'censer-leg');
    leg.position.set(Math.cos(angle) * 0.58, 0.34, Math.sin(angle) * 0.58);
    censer.add(leg);
  }

  for (const side of [-1, 1]) {
    const handle = mark(new Mesh(
      new TorusGeometry(0.36, 0.075, 8, 20),
      materials.stone,
    ), 'censer-handle');
    handle.rotation.y = Math.PI / 2;
    handle.position.set(side * 1.03, 1.42, 0);
    censer.add(handle);
  }

  const terraceCenterZ = data.platformDepth.value / 2 + data.terraceDepth.value / 2;
  censer.position.set(0, data.platformHeight + 0.08, terraceCenterZ);
  return censer;
}
