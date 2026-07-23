import {
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
} from 'three';
import type { BuildingData } from '../data/building';

export interface BuildingMaterials {
  timber: MeshStandardMaterial;
  darkTimber: MeshStandardMaterial;
  paintedGreen: MeshStandardMaterial;
  paintedBlue: MeshStandardMaterial;
  roofSurface: MeshStandardMaterial;
  tile: MeshStandardMaterial;
  tileRib: MeshStandardMaterial;
  diamondTile: MeshStandardMaterial;
  glazedGreen: MeshPhysicalMaterial;
  stone: MeshStandardMaterial;
  brick: MeshStandardMaterial;
  paving: MeshStandardMaterial;
  door: MeshStandardMaterial;
  gold: MeshPhysicalMaterial;
  all: Material[];
}

function weathered(color: number, roughness: number): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(color),
    roughness,
    metalness: 0,
  });
}

export function createBuildingMaterials(data: BuildingData): BuildingMaterials {
  const timber = weathered(data.palette.timber, 0.86);
  const darkTimber = weathered(data.palette.darkTimber, 0.92);
  const paintedGreen = weathered(data.palette.paintedGreen, 0.78);
  const paintedBlue = weathered(0x315d62, 0.8);
  const roofSurface = weathered(0x4f534f, 0.95);
  roofSurface.side = DoubleSide;
  const tile = weathered(0x74736c, 0.93);
  tile.side = DoubleSide;
  const tileRib = weathered(0x565852, 0.92);
  const diamondTile = weathered(0x2f543d, 0.9);
  const stone = weathered(data.palette.stone, 0.96);
  const brick = weathered(data.palette.brick, 0.98);
  const paving = weathered(0x77756c, 0.96);
  const door = weathered(0x4a211d, 0.88);
  const glazedGreen = new MeshPhysicalMaterial({
    color: data.palette.glazedGreen,
    roughness: 0.48,
    metalness: 0.05,
    clearcoat: 0.22,
    clearcoatRoughness: 0.68,
  });
  const gold = new MeshPhysicalMaterial({
    color: 0x8f6b2d,
    roughness: 0.58,
    metalness: 0.28,
  });

  return {
    timber,
    darkTimber,
    paintedGreen,
    paintedBlue,
    roofSurface,
    tile,
    tileRib,
    diamondTile,
    glazedGreen,
    stone,
    brick,
    paving,
    door,
    gold,
    all: [timber, darkTimber, paintedGreen, paintedBlue, roofSurface, tile, tileRib, diamondTile, glazedGreen, stone, brick, paving, door, gold],
  };
}
