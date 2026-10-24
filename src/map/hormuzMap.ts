import * as THREE from 'three';
import { Collider, HeightAtFunction } from './mapTypes';
import { UpgradedMapResult } from './mapBuilder';
import { createDeadshotContainerTexture } from './mapTextures';

/**
 * Strait of Hormuz Tactical Naval Map
 * Features high coastal rocky cliffs, military lookout fortress, cargo shipping platform,
 * oceanic water strait with animated waves, navigational buoys, and a cruising container vessel.
 */
export function buildHormuzMap(
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

  // --- Shared PBR Materials ---
  const WATER_COLOR = 0x1a5577;
  const ROCK_COLOR = 0x6a5a4a;
  const ROCK_DARK = 0x4a3a2a;
  const SAND_COLOR = 0xc4a870;
  const FORTRESS_COLOR = 0x5a5d64;

  const matWater = new THREE.MeshStandardMaterial({
    color: WATER_COLOR,
    roughness: 0.18,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88
  });

  const matWaterSurface = new THREE.MeshStandardMaterial({
    color: 0x227799,
    roughness: 0.12,
    metalness: 0.45,
    transparent: true,
    opacity: 0.55
  });

  const matRock = new THREE.MeshStandardMaterial({
    color: ROCK_COLOR,
    roughness: 0.92,
    metalness: 0.05
  });

  const matRockDark = new THREE.MeshStandardMaterial({
    color: ROCK_DARK,
    roughness: 0.95,
    metalness: 0.05
  });

  const matSand = new THREE.MeshStandardMaterial({
    color: SAND_COLOR,
    roughness: 0.88,
    metalness: 0.02
  });

  const matFortress = new THREE.MeshStandardMaterial({
    color: FORTRESS_COLOR,
    roughness: 0.65,
    metalness: 0.35
  });

  const matFortressWall = new THREE.MeshStandardMaterial({
    color: 0x686c75,
    roughness: 0.7,
    metalness: 0.25
  });

  const matSteel = new THREE.MeshStandardMaterial({
    color: 0x3a3f47,
    roughness: 0.4,
    metalness: 0.8
  });

  const matBuoy = new THREE.MeshStandardMaterial({
    color: 0xdd3322,
    roughness: 0.5,
    metalness: 0.2
  });

  const matBeaconGlow = new THREE.MeshStandardMaterial({
    color: 0xff3311,
    emissive: 0xff2200,
    emissiveIntensity: 2.5
  });

  // ── WATER (The Strait) ──
  const waterBed = new THREE.Mesh(new THREE.BoxGeometry(320, 2, 320), matWater);
  waterBed.position.set(0, -1, 0);
  waterBed.receiveShadow = true;
  markStatic(waterBed);
  mapGroup.add(waterBed);
  addCollider(0, -1, 0, 320, 2, 320);

  const waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(320, 320, 16, 16), matWaterSurface);
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.set(0, 0.08, 0);
  mapGroup.add(waterSurface);

  // ── SOUTH LANDMASS (Main Tactical Bastion) ──
  const southCliff = new THREE.Mesh(new THREE.BoxGeometry(220, 22, 90), matRock);
  southCliff.position.set(0, 10, -68);
  southCliff.receiveShadow = true;
  markStatic(southCliff);
  mapGroup.add(southCliff);
  addCollider(0, 10, -68, 220, 22, 90);

  const cliffFace = new THREE.Mesh(new THREE.BoxGeometry(190, 12, 5), matRockDark);
  cliffFace.position.set(0, 5, -21);
  markStatic(cliffFace);
  mapGroup.add(cliffFace);

  const southBeach = new THREE.Mesh(new THREE.BoxGeometry(180, 1.2, 12), matSand);
  southBeach.rotation.x = 0.25;
  southBeach.position.set(0, 0.6, -16);
  markStatic(southBeach);
  mapGroup.add(southBeach);

  // ── FORTRESS / LOOKOUT COMPLEX (Elevation Y=21 to Y=26) ──
  // Main Platform (combat arena floor)
  const fortressFloor = new THREE.Mesh(new THREE.BoxGeometry(44, 2, 36), matFortress);
  fortressFloor.position.set(0, 21, -52);
  fortressFloor.receiveShadow = true;
  markStatic(fortressFloor);
  mapGroup.add(fortressFloor);
  addCollider(0, 21, -52, 44, 2, 36);

  // Rear High Fortress Wall
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(46, 7, 3), matFortressWall);
  rearWall.position.set(0, 25.5, -70);
  rearWall.castShadow = true;
  markStatic(rearWall);
  mapGroup.add(rearWall);
  addCollider(0, 25.5, -70, 46, 7, 3);

  // Front Low Wall (waist-height sniper cover overlooking strait)
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(44, 1.1, 1.5), matFortressWall);
  frontWall.position.set(0, 22.55, -34);
  frontWall.castShadow = true;
  markStatic(frontWall);
  mapGroup.add(frontWall);
  addCollider(0, 22.55, -34, 44, 1.1, 1.5);

  // Front Crenellations / Battlements
  for (let i = 0; i < 15; i++) {
    const cren = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.6), matFortress);
    cren.position.set(-20 + i * 2.85, 23.3, -34);
    cren.castShadow = true;
    markStatic(cren);
    mapGroup.add(cren);
    addCollider(-20 + i * 2.85, 23.3, -34, 1.2, 1.0, 1.6);
  }

  // Left & Right Fortress Flank Walls
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 5, 36), matFortressWall);
  leftWall.position.set(-22, 24.5, -52);
  markStatic(leftWall);
  mapGroup.add(leftWall);
  addCollider(-22, 24.5, -52, 2.5, 5, 36);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 5, 36), matFortressWall);
  rightWall.position.set(22, 24.5, -52);
  markStatic(rightWall);
  mapGroup.add(rightWall);
  addCollider(22, 24.5, -52, 2.5, 5, 36);

  // Twin Watchtowers (Flanking the fortress)
  const towerLeft = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 6), matFortress);
  towerLeft.position.set(-23, 27, -52);
  towerLeft.castShadow = true;
  markStatic(towerLeft);
  mapGroup.add(towerLeft);
  addCollider(-23, 27, -52, 6, 12, 6);

  const towerRight = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 6), matFortress);
  towerRight.position.set(23, 27, -52);
  towerRight.castShadow = true;
  markStatic(towerRight);
  mapGroup.add(towerRight);
  addCollider(23, 27, -52, 6, 12, 6);

  // Radar dome atop tower left
  const radarMast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 8), matSteel);
  radarMast.position.set(-23, 34, -52);
  const radarDish = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), matSteel);
  radarDish.position.set(-23, 36, -52);
  radarDish.rotation.x = 0.5;
  mapGroup.add(radarMast, radarDish);

  // Fortress Tactical Corrugated Deadshot Cargo Containers
  const containerSpecs = [
    { x: -10, z: -46, rot: 0.1, hex: '#0984e3', code: 'DS-NAV-BLU' },
    { x: 10, z: -46, rot: -0.15, hex: '#d63031', code: 'DS-NAV-RED' },
    { x: -6, z: -60, rot: 0, hex: '#00b894', code: 'DS-CARGO-03' },
    { x: 7, z: -60, rot: 0.2, hex: '#fdcb6e', code: 'DS-HAZARD-04' },
    { x: 0, z: -50, rot: 0, hex: '#2d3436', code: 'DS-SPEC-OPS' }
  ];

  containerSpecs.forEach((cp, idx) => {
    const cTex = createDeadshotContainerTexture(cp.hex, cp.code);
    const cMat = new THREE.MeshStandardMaterial({ map: cTex, roughness: 0.6, metalness: 0.35 });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.8, 2.6), cMat);
    crate.position.set(cp.x, 23.4, cp.z);
    crate.rotation.y = cp.rot;
    crate.castShadow = true;
    markStatic(crate);
    mapGroup.add(crate);
    addCollider(cp.x, 23.4, cp.z, 5.2, 2.8, 2.8);

    if (idx < 2) {
      // Stack a smaller secondary supply box on top
      const topTex = createDeadshotContainerTexture(idx === 0 ? '#e17055' : '#6c5ce7', `DS-AMMO-0${idx + 1}`);
      const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.55, metalness: 0.4 });
      const topBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 2.2), topMat);
      topBox.position.set(cp.x + 0.3, 25.7, cp.z);
      topBox.castShadow = true;
      markStatic(topBox);
      mapGroup.add(topBox);
      addCollider(cp.x + 0.3, 25.7, cp.z, 2.4, 1.8, 2.2);
    }
  });

  // ── NORTH LANDMASS (Enemy Bastion Across the Strait) ──
  const northCliff = new THREE.Mesh(new THREE.BoxGeometry(220, 18, 90), matRock);
  northCliff.position.set(0, 8, 68);
  northCliff.receiveShadow = true;
  markStatic(northCliff);
  mapGroup.add(northCliff);
  addCollider(0, 8, 68, 220, 18, 90);

  const northFace = new THREE.Mesh(new THREE.BoxGeometry(190, 8, 5), matRockDark);
  northFace.position.set(0, 3, 22);
  markStatic(northFace);
  mapGroup.add(northFace);

  const northBeach = new THREE.Mesh(new THREE.BoxGeometry(180, 1.2, 12), matSand);
  northBeach.rotation.x = -0.25;
  northBeach.position.set(0, 0.6, 17);
  markStatic(northBeach);
  mapGroup.add(northBeach);

  // North Outpost Bunker & Catwalks
  const northBunker = new THREE.Mesh(new THREE.BoxGeometry(36, 4, 18), matFortress);
  northBunker.position.set(0, 18.5, 52);
  markStatic(northBunker);
  mapGroup.add(northBunker);
  addCollider(0, 18.5, 52, 36, 4, 18);

  // ── NAVIGATIONAL BUOYS WITH FLASHING BEACONS ──
  const buoyX = [-65, -25, 25, 65];
  const buoyMeshes: THREE.Mesh[] = [];
  buoyX.forEach(bx => {
    const buoyBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 3.5, 8), matBuoy);
    buoyBase.position.set(bx, 1.4, 0);
    markStatic(buoyBase);
    mapGroup.add(buoyBase);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), matBeaconGlow);
    beacon.position.set(bx, 3.6, 0);
    buoyMeshes.push(beacon);
    mapGroup.add(beacon);
  });

  // ── CONTAINER CARGO SHIP CRUISING THE STRAIT ──
  const shipGroup = new THREE.Group();
  shipGroup.position.set(30, 0, 0);
  mapGroup.add(shipGroup);

  // Ship Hull
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x1f2329, roughness: 0.6, metalness: 0.4 });
  const hullDeckMat = new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.7, metalness: 0.2 });
  const shipHull = new THREE.Mesh(new THREE.BoxGeometry(42, 4.5, 12), hullMat);
  shipHull.position.set(0, 1.8, 0);
  shipHull.castShadow = true;
  shipGroup.add(shipHull);

  const shipDeck = new THREE.Mesh(new THREE.BoxGeometry(40, 0.6, 11), hullDeckMat);
  shipDeck.position.set(0, 4.2, 0);
  shipGroup.add(shipDeck);

  // Superstructure Bridge at stern
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xdde2ea, roughness: 0.5, metalness: 0.3 });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 9), bridgeMat);
  bridge.position.set(-14, 7.8, 0);
  bridge.castShadow = true;
  shipGroup.add(bridge);

  // Ship Shipping Containers
  const sColors = [0x1f4e8c, 0x8c281f, 0x2b6e3f, 0xc7821f];
  for (let row = 0; row < 4; row++) {
    for (let col = -1; col <= 1; col++) {
      const cMat = new THREE.MeshStandardMaterial({ color: sColors[(row + col + 4) % sColors.length], roughness: 0.5, metalness: 0.4 });
      const sc = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 2.8), cMat);
      sc.position.set(-4 + row * 6.6, 5.8, col * 3.2);
      sc.castShadow = true;
      shipGroup.add(sc);
    }
  }

  // ── DISTANT ARABIAN MOUNTAIN BACKDROP ──
  const mountains = [
    [-110, 25, 130, 70, 45], [0, 32, 140, 85, 55], [110, 22, 135, 65, 40],
    [-110, 20, -140, 65, 40], [0, 30, -150, 85, 50], [110, 24, -145, 75, 45]
  ];
  mountains.forEach(([x, y, z, w, h]) => {
    const mtn = new THREE.Mesh(new THREE.BoxGeometry(w, h, 28), matRockDark);
    mtn.position.set(x, y, z);
    markStatic(mtn);
    mapGroup.add(mtn);
  });

  return {
    update: (delta: number, elapsed: number) => {
      // Ship slow cruising along the strait
      shipGroup.position.x -= delta * 3.2;
      if (shipGroup.position.x < -160) {
        shipGroup.position.x = 160;
      }
      // Gentle ship bobbing in the waves
      shipGroup.position.y = Math.sin(elapsed * 1.5) * 0.15;
      shipGroup.rotation.z = Math.sin(elapsed * 1.2) * 0.015;

      // Navigational beacon flashing
      const beaconIntensity = 1.0 + Math.sin(elapsed * 4) * 1.5;
      buoyMeshes.forEach(b => {
        (b.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.max(0.2, beaconIntensity);
      });

      // Water surface wave motion
      if (waterSurface) {
        waterSurface.position.y = 0.08 + Math.sin(elapsed * 1.8) * 0.06;
      }
    }
  };
}
