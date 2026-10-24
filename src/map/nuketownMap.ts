import * as THREE from 'three';
import { Collider, HeightAtFunction } from './mapTypes';
import { UpgradedMapResult } from './mapBuilder';
import {
  createAsphaltRoadTexture,
  createSuburbanSidingTexture,
  createGarageDoorTexture,
  createSidewalkTexture
} from './mapTextures';

/**
 * Nuketown Iconic Arena Map (Deadshot Tactical Edition)
 * Faithful recreation of the legendary close-quarters desert suburban cul-de-sac.
 * Features textured asphalt roads with yellow double-lines, vinyl lap siding houses,
 * embossed panel garage doors, concrete curbs, school bus, moving truck, and fenced yards.
 */
export function buildNuketownMap(
  scene: THREE.Scene,
  colliders: Collider[],
  _heightAt: HeightAtFunction,
  _halfW: number,
  _halfD: number
): UpgradedMapResult {
  const mapGroup = new THREE.Group();
  scene.add(mapGroup);

  function addCollider(x: number, y: number, z: number, w: number, h: number, d: number) {
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      top: y + h / 2,
      bottom: y - h / 2
    });
  }

  function markStatic(mesh: THREE.Object3D) {
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
  }

  // --- High-Quality Deadshot PBR Materials ---
  const texAsphalt = createAsphaltRoadTexture('#ffcc00', '#20222a');
  const texSidewalk = createSidewalkTexture('#cac3b6');
  const texTealSiding = createSuburbanSidingTexture('#3a9c8f', '#246b62');
  const texYellowSiding = createSuburbanSidingTexture('#d4ab30', '#9c7b1e');
  const texGarageDoor = createGarageDoorTexture();

  const matDesert = new THREE.MeshStandardMaterial({ color: 0xcdb896, roughness: 0.94, metalness: 0.02 });
  const matAsphalt = new THREE.MeshStandardMaterial({ map: texAsphalt, roughness: 0.82, metalness: 0.12 });
  const matSidewalk = new THREE.MeshStandardMaterial({ map: texSidewalk, roughness: 0.85, metalness: 0.05 });
  const matTealWall = new THREE.MeshStandardMaterial({ map: texTealSiding, roughness: 0.72, metalness: 0.08 });
  const matYellowWall = new THREE.MeshStandardMaterial({ map: texYellowSiding, roughness: 0.75, metalness: 0.08 });
  const matGarage = new THREE.MeshStandardMaterial({ map: texGarageDoor, roughness: 0.55, metalness: 0.25 });
  const matHouseTrim = new THREE.MeshStandardMaterial({ color: 0xfbf9f5, roughness: 0.55, metalness: 0.1 });
  const matHouseRoof = new THREE.MeshStandardMaterial({ color: 0x423d38, roughness: 0.85, metalness: 0.15 });
  const matLawn = new THREE.MeshStandardMaterial({ color: 0x588c3a, roughness: 0.92, metalness: 0.02 });
  const matFence = new THREE.MeshStandardMaterial({ color: 0x8a6d4d, roughness: 0.88, metalness: 0.05 });
  const matHedge = new THREE.MeshStandardMaterial({ color: 0x3d6e2e, roughness: 0.9, metalness: 0.02 });
  const matBus = new THREE.MeshStandardMaterial({ color: 0xdf9824, roughness: 0.45, metalness: 0.3 });
  const matTruck = new THREE.MeshStandardMaterial({ color: 0x2e669e, roughness: 0.5, metalness: 0.3 });
  const matCarRed = new THREE.MeshStandardMaterial({ color: 0xb52c2c, roughness: 0.4, metalness: 0.5 });
  const matCarTeal = new THREE.MeshStandardMaterial({ color: 0x2d8a80, roughness: 0.4, metalness: 0.5 });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x88c4e0, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.65 });
  const matConcrete = new THREE.MeshStandardMaterial({ color: 0x888b90, roughness: 0.9, metalness: 0.1 });

  // ── DESERT BASE & CUL-DE-SAC GROUND ──
  const desertBase = new THREE.Mesh(new THREE.BoxGeometry(160, 1.0, 140), matDesert);
  desertBase.position.set(0, -0.5, 0);
  desertBase.receiveShadow = true;
  markStatic(desertBase);
  mapGroup.add(desertBase);
  addCollider(0, -0.5, 0, 160, 1.0, 140);

  // Cul-de-sac Main Road
  const culDeSacRoad = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 0.1, 32), matAsphalt);
  culDeSacRoad.position.set(0, 0.05, 0);
  culDeSacRoad.receiveShadow = true;
  markStatic(culDeSacRoad);
  mapGroup.add(culDeSacRoad);

  // Entrance Avenue Road
  const entranceRoad = new THREE.Mesh(new THREE.BoxGeometry(16, 0.1, 70), matAsphalt);
  entranceRoad.position.set(0, 0.05, 45);
  entranceRoad.receiveShadow = true;
  markStatic(entranceRoad);
  mapGroup.add(entranceRoad);

  // Sidewalk Roundabout Curbs
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xded8cc, roughness: 0.8 });
  const curbRing = new THREE.Mesh(new THREE.TorusGeometry(24.2, 0.25, 8, 32), curbMat);
  curbRing.rotation.x = Math.PI / 2;
  curbRing.position.set(0, 0.15, 0);
  markStatic(curbRing);
  mapGroup.add(curbRing);

  // ── FRONT LAWNS ──
  const lawnLeft = new THREE.Mesh(new THREE.BoxGeometry(26, 0.2, 34), matLawn);
  lawnLeft.position.set(-36, 0.1, -4);
  lawnLeft.receiveShadow = true;
  markStatic(lawnLeft);
  mapGroup.add(lawnLeft);

  const lawnRight = new THREE.Mesh(new THREE.BoxGeometry(26, 0.2, 34), matLawn);
  lawnRight.position.set(36, 0.1, -4);
  lawnRight.receiveShadow = true;
  markStatic(lawnRight);
  mapGroup.add(lawnRight);

  // ── TEAL HOUSE (Left, X = -38) ──
  // Main two-story house body
  const tealMain = new THREE.Mesh(new THREE.BoxGeometry(20, 8.5, 24), matTealWall);
  tealMain.position.set(-38, 4.25, -6);
  tealMain.castShadow = true;
  tealMain.receiveShadow = true;
  markStatic(tealMain);
  mapGroup.add(tealMain);
  addCollider(-38, 4.25, -6, 20, 8.5, 24);

  // Teal House Pitched Roof
  const tealRoof = new THREE.Mesh(new THREE.ConeGeometry(17, 3.8, 4), matHouseRoof);
  tealRoof.rotation.y = Math.PI / 4;
  tealRoof.position.set(-38, 10.4, -6);
  tealRoof.castShadow = true;
  markStatic(tealRoof);
  mapGroup.add(tealRoof);

  // Front Porch
  const tealPorch = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 4), matHouseTrim);
  tealPorch.position.set(-34, 0.2, 8);
  markStatic(tealPorch);
  mapGroup.add(tealPorch);

  // Second Floor Sniper Window Cutout & Balcony
  const tealSniperBalcony = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 3), matHouseTrim);
  tealSniperBalcony.position.set(-32, 5.2, 7);
  tealSniperBalcony.castShadow = true;
  markStatic(tealSniperBalcony);
  mapGroup.add(tealSniperBalcony);
  addCollider(-32, 5.2, 7, 6, 0.4, 3);

  const tealBalconyRail = new THREE.Mesh(new THREE.BoxGeometry(6, 0.9, 0.3), matHouseTrim);
  tealBalconyRail.position.set(-32, 5.85, 8.4);
  markStatic(tealBalconyRail);
  mapGroup.add(tealBalconyRail);
  addCollider(-32, 5.85, 8.4, 6, 0.9, 0.3);

  // Teal Garage
  const tealGarage = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 14), matTealWall);
  tealGarage.position.set(-38, 2.25, -24);
  tealGarage.castShadow = true;
  markStatic(tealGarage);
  mapGroup.add(tealGarage);
  addCollider(-38, 2.25, -24, 12, 4.5, 14);

  // ── YELLOW HOUSE (Right, X = 38) ──
  // Main two-story house body
  const yellowMain = new THREE.Mesh(new THREE.BoxGeometry(20, 8.5, 24), matYellowWall);
  yellowMain.position.set(38, 4.25, -6);
  yellowMain.castShadow = true;
  yellowMain.receiveShadow = true;
  markStatic(yellowMain);
  mapGroup.add(yellowMain);
  addCollider(38, 4.25, -6, 20, 8.5, 24);

  // Yellow House Pitched Roof
  const yellowRoof = new THREE.Mesh(new THREE.ConeGeometry(17, 3.8, 4), matHouseRoof);
  yellowRoof.rotation.y = Math.PI / 4;
  yellowRoof.position.set(38, 10.4, -6);
  yellowRoof.castShadow = true;
  markStatic(yellowRoof);
  mapGroup.add(yellowRoof);

  // Front Porch
  const yellowPorch = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 4), matHouseTrim);
  yellowPorch.position.set(34, 0.2, 8);
  markStatic(yellowPorch);
  mapGroup.add(yellowPorch);

  // Second Floor Sniper Window Cutout & Balcony
  const yellowSniperBalcony = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 3), matHouseTrim);
  yellowSniperBalcony.position.set(32, 5.2, 7);
  yellowSniperBalcony.castShadow = true;
  markStatic(yellowSniperBalcony);
  mapGroup.add(yellowSniperBalcony);
  addCollider(32, 5.2, 7, 6, 0.4, 3);

  const yellowBalconyRail = new THREE.Mesh(new THREE.BoxGeometry(6, 0.9, 0.3), matHouseTrim);
  yellowBalconyRail.position.set(32, 5.85, 8.4);
  markStatic(yellowBalconyRail);
  mapGroup.add(yellowBalconyRail);
  addCollider(32, 5.85, 8.4, 6, 0.9, 0.3);

  // Yellow Garage
  const yellowGarage = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 14), matYellowWall);
  yellowGarage.position.set(38, 2.25, -24);
  yellowGarage.castShadow = true;
  markStatic(yellowGarage);
  mapGroup.add(yellowGarage);
  addCollider(38, 2.25, -24, 12, 4.5, 14);

  // ── CENTER VEHICLES (Iconic School Bus & Moving Van) ──
  // 1. School Bus (Angled across center road)
  const busGroup = new THREE.Group();
  busGroup.position.set(-4, 0, 4);
  busGroup.rotation.y = 0.38;
  mapGroup.add(busGroup);

  const busBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 13), matBus);
  busBody.position.set(0, 2.0, 0);
  busBody.castShadow = true;
  busGroup.add(busBody);
  addCollider(-4, 2.0, 4, 6.5, 3.2, 14);

  const busHood = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.8, 3.0), matBus);
  busHood.position.set(0, 1.3, 7.5);
  busHood.castShadow = true;
  busGroup.add(busHood);

  // Bus Windows stripe
  const busWinL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 11), matGlass);
  busWinL.position.set(-2.15, 2.6, -0.4);
  const busWinR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 11), matGlass);
  busWinR.position.set(2.15, 2.6, -0.4);
  busGroup.add(busWinL, busWinR);

  // 2. Moving Truck (Opposing angle)
  const truckGroup = new THREE.Group();
  truckGroup.position.set(7, 0, -5);
  truckGroup.rotation.y = -0.32;
  mapGroup.add(truckGroup);

  const truckCab = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.0, 3.5), matTruck);
  truckCab.position.set(0, 1.8, 5.0);
  truckCab.castShadow = true;
  truckGroup.add(truckCab);

  const truckBox = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.6, 9.5), new THREE.MeshStandardMaterial({ color: 0xdde0e5, roughness: 0.6 }));
  truckBox.position.set(0, 2.2, -1.2);
  truckBox.castShadow = true;
  truckGroup.add(truckBox);
  addCollider(7, 2.2, -5, 6.2, 3.6, 12);

  // ── DRIVEWAY CARS ──
  // Teal Driveway Car (Left)
  const carLeft = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.6, 6.0), matCarRed);
  carLeft.position.set(-23, 1.0, 12);
  carLeft.rotation.y = 0.15;
  carLeft.castShadow = true;
  markStatic(carLeft);
  mapGroup.add(carLeft);
  addCollider(-23, 1.0, 12, 3.2, 1.6, 6.2);

  // Yellow Driveway Car (Right)
  const carRight = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.6, 6.0), matCarTeal);
  carRight.position.set(23, 1.0, 12);
  carRight.rotation.y = -0.2;
  carRight.castShadow = true;
  markStatic(carRight);
  mapGroup.add(carRight);
  addCollider(23, 1.0, 12, 3.2, 1.6, 6.2);

  // ── WOODEN BACKYARD FENCES ──
  // Left backyard perimeter fence
  const fenceL1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 30), matFence);
  fenceL1.position.set(-49, 1.1, -12);
  markStatic(fenceL1);
  mapGroup.add(fenceL1);
  addCollider(-49, 1.1, -12, 0.6, 2.2, 30);

  const fenceL2 = new THREE.Mesh(new THREE.BoxGeometry(24, 2.2, 0.3), matFence);
  fenceL2.position.set(-37, 1.1, -27);
  markStatic(fenceL2);
  mapGroup.add(fenceL2);
  addCollider(-37, 1.1, -27, 24, 2.2, 0.6);

  // Right backyard perimeter fence
  const fenceR1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 30), matFence);
  fenceR1.position.set(49, 1.1, -12);
  markStatic(fenceR1);
  mapGroup.add(fenceR1);
  addCollider(49, 1.1, -12, 0.6, 2.2, 30);

  const fenceR2 = new THREE.Mesh(new THREE.BoxGeometry(24, 2.2, 0.3), matFence);
  fenceR2.position.set(37, 1.1, -27);
  markStatic(fenceR2);
  mapGroup.add(fenceR2);
  addCollider(37, 1.1, -27, 24, 2.2, 0.6);

  // ── TACTICAL SANDBAG BUNKERS & JERSEY BARRIERS ──
  const sandbagPositions = [
    { x: -14, z: -10, rot: 0.3 },
    { x: 14,  z: -10, rot: -0.3 },
    { x: 0,   z: -18, rot: 0 },
    { x: -8,  z: 18,  rot: 0.1 },
    { x: 8,   z: 18,  rot: -0.1 }
  ];
  sandbagPositions.forEach(sb => {
    const sMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.4), matConcrete);
    sMesh.position.set(sb.x, 0.55, sb.z);
    sMesh.rotation.y = sb.rot;
    sMesh.castShadow = true;
    markStatic(sMesh);
    mapGroup.add(sMesh);
    addCollider(sb.x, 0.55, sb.z, 4.4, 1.1, 1.6);
  });

  // Hedges along house walkways
  [-25, 25].forEach(hx => {
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 12), matHedge);
    hedge.position.set(hx, 0.8, -4);
    markStatic(hedge);
    mapGroup.add(hedge);
    addCollider(hx, 0.8, -4, 1.6, 1.6, 12);
  });

  // ── DESERT POWER POLES & STREET LAMPS ──
  const poleCoords = [
    [-18, 28], [18, 28], [-44, 18], [44, 18]
  ];
  poleCoords.forEach(([px, pz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 9, 8), matFence);
    pole.position.set(px, 4.5, pz);
    pole.castShadow = true;
    markStatic(pole);
    mapGroup.add(pole);
    addCollider(px, 4.5, pz, 0.45, 9, 0.45);

    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.2), matFence);
    crossArm.position.set(px, 8.2, pz);
    markStatic(crossArm);
    mapGroup.add(crossArm);
  });

  return {
    update: (_delta: number, _elapsed: number) => {
      // Solid desert daytime performance
    }
  };
}
