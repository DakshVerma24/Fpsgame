import * as THREE from 'three';
import { Collider, HeightAtFunction } from './mapTypes';
import { UpgradedMapResult } from './mapBuilder';

/**
 * E-Island Tropical Island Compound Map
 * Features a luxurious private island estate with coastal cliffs, sandy beachfront,
 * multi-wing grand mansion pavilion, swimming pool, palm groves, runway, helipad, and yachts.
 */
export function buildEIslandMap(
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
  const GRASS = 0x4a8a3a;
  const GRASS_DARK = 0x3a7a2a;
  const SAND = 0xe8d8a8;
  const WATER = 0x1a6688;
  const STONE = 0x888888;
  const MANSION_WALL = 0xf2ece2;
  const MANSION_ROOF = 0x7a3a2a;
  const RUNWAY = 0x444850;

  const matGrass = new THREE.MeshStandardMaterial({ color: GRASS, roughness: 0.9, metalness: 0.05 });
  const matGrassDark = new THREE.MeshStandardMaterial({ color: GRASS_DARK, roughness: 0.9, metalness: 0.05 });
  const matSand = new THREE.MeshStandardMaterial({ color: SAND, roughness: 0.88, metalness: 0.02 });
  const matWater = new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.85 });
  const matWaterSurface = new THREE.MeshStandardMaterial({ color: 0x2288aa, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.5 });
  const matStone = new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.72, metalness: 0.15 });
  const matMansionWall = new THREE.MeshStandardMaterial({ color: MANSION_WALL, roughness: 0.68, metalness: 0.12 });
  const matMansionRoof = new THREE.MeshStandardMaterial({ color: MANSION_ROOF, roughness: 0.75, metalness: 0.1 });
  const matRunway = new THREE.MeshStandardMaterial({ color: RUNWAY, roughness: 0.65, metalness: 0.3 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9 });
  const matPalmLeaves = new THREE.MeshStandardMaterial({ color: 0x2e802e, roughness: 0.85 });

  // ── SURROUNDING OCEAN ──
  const oceanBed = new THREE.Mesh(new THREE.BoxGeometry(320, 2, 320), matWater);
  oceanBed.position.set(0, -2, 0);
  oceanBed.receiveShadow = true;
  markStatic(oceanBed);
  mapGroup.add(oceanBed);
  addCollider(0, -2, 0, 320, 2, 320);

  const oceanSurface = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), matWaterSurface);
  oceanSurface.rotation.x = -Math.PI / 2;
  oceanSurface.position.set(0, -0.4, 0);
  mapGroup.add(oceanSurface);

  // ── ISLAND BASE & TERRAIN ──
  // Main island ground
  const islandGround = new THREE.Mesh(new THREE.BoxGeometry(110, 2, 90), matGrass);
  islandGround.position.set(0, 0, 0);
  islandGround.receiveShadow = true;
  markStatic(islandGround);
  mapGroup.add(islandGround);
  addCollider(0, 0, 0, 110, 2, 90);

  // Elevated central terrace for the mansion
  const elevatedTerrace = new THREE.Mesh(new THREE.BoxGeometry(75, 2.5, 55), matGrassDark);
  elevatedTerrace.position.set(0, 1.25, -12);
  elevatedTerrace.receiveShadow = true;
  markStatic(elevatedTerrace);
  mapGroup.add(elevatedTerrace);
  addCollider(0, 1.25, -12, 75, 2.5, 55);

  // Perimeter Sandy Beach slopes
  const beachN = new THREE.Mesh(new THREE.BoxGeometry(118, 0.6, 12), matSand);
  beachN.position.set(0, 0.1, 48);
  markStatic(beachN);
  mapGroup.add(beachN);

  const beachS = new THREE.Mesh(new THREE.BoxGeometry(118, 0.6, 12), matSand);
  beachS.position.set(0, 0.1, -48);
  markStatic(beachS);
  mapGroup.add(beachS);

  const beachE = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 96), matSand);
  beachE.position.set(58, 0.1, 0);
  markStatic(beachE);
  mapGroup.add(beachE);

  const beachW = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 96), matSand);
  beachW.position.set(-58, 0.1, 0);
  markStatic(beachW);
  mapGroup.add(beachW);

  // ── GRAND MANSION PAVILION ──
  // Main building body
  const mansionMain = new THREE.Mesh(new THREE.BoxGeometry(24, 9, 18), matMansionWall);
  mansionMain.position.set(0, 7.0, -25);
  mansionMain.castShadow = true;
  mansionMain.receiveShadow = true;
  markStatic(mansionMain);
  mapGroup.add(mansionMain);
  addCollider(0, 7.0, -25, 24, 9, 18);

  // Accessible Roof Terrace
  const mansionRoof = new THREE.Mesh(new THREE.BoxGeometry(25.5, 1, 19.5), matMansionRoof);
  mansionRoof.position.set(0, 11.8, -25);
  mansionRoof.receiveShadow = true;
  markStatic(mansionRoof);
  mapGroup.add(mansionRoof);
  addCollider(0, 11.8, -25, 25.5, 1, 19.5);

  // Roof Balustrades / Railings (player cover and boundary)
  const railFront = new THREE.Mesh(new THREE.BoxGeometry(25.5, 0.9, 0.5), matStone);
  railFront.position.set(0, 12.6, -15.5);
  railFront.castShadow = true;
  markStatic(railFront);
  mapGroup.add(railFront);
  addCollider(0, 12.6, -15.5, 25.5, 0.9, 0.5);

  const railBack = new THREE.Mesh(new THREE.BoxGeometry(25.5, 1.8, 0.5), matStone);
  railBack.position.set(0, 13.0, -34.5);
  markStatic(railBack);
  mapGroup.add(railBack);
  addCollider(0, 13.0, -34.5, 25.5, 1.8, 0.5);

  const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 19.5), matStone);
  railLeft.position.set(-12.6, 12.6, -25);
  markStatic(railLeft);
  mapGroup.add(railLeft);
  addCollider(-12.6, 12.6, -25, 0.5, 0.9, 19.5);

  const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 19.5), matStone);
  railRight.position.set(12.6, 12.6, -25);
  markStatic(railRight);
  mapGroup.add(railRight);
  addCollider(12.6, 12.6, -25, 0.5, 0.9, 19.5);

  // Entrance Doric Columns
  [-4.5, 4.5].forEach(cx => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 7.5, 12), matStone);
    col.position.set(cx, 6.2, -15.5);
    col.castShadow = true;
    markStatic(col);
    mapGroup.add(col);
    addCollider(cx, 6.2, -15.5, 0.9, 7.5, 0.9);
  });

  // Left Mansion Wing
  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(13, 6, 14), matMansionWall);
  leftWing.position.set(-18, 5.5, -25);
  leftWing.castShadow = true;
  markStatic(leftWing);
  mapGroup.add(leftWing);
  addCollider(-18, 5.5, -25, 13, 6, 14);

  const leftWingRoof = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.8, 15.5), matMansionRoof);
  leftWingRoof.position.set(-18, 8.8, -25);
  markStatic(leftWingRoof);
  mapGroup.add(leftWingRoof);

  // Right Mansion Wing
  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(13, 6, 14), matMansionWall);
  rightWing.position.set(18, 5.5, -25);
  rightWing.castShadow = true;
  markStatic(rightWing);
  mapGroup.add(rightWing);
  addCollider(18, 5.5, -25, 13, 6, 14);

  const rightWingRoof = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.8, 15.5), matMansionRoof);
  rightWingRoof.position.set(18, 8.8, -25);
  markStatic(rightWingRoof);
  mapGroup.add(rightWingRoof);

  // ── LUXURY SWIMMING POOL ──
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x2299cc, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.75 });
  const poolWater = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 7), poolMat);
  poolWater.position.set(0, 1.8, -8);
  mapGroup.add(poolWater);

  const poolCoping = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.4, 8.5), matStone);
  poolCoping.position.set(0, 2.1, -8);
  markStatic(poolCoping);
  mapGroup.add(poolCoping);
  addCollider(0, 2.1, -8, 13.5, 0.4, 8.5);

  // ── CENTRAL STONE PATHWAY ──
  const stonePath = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 28), matStone);
  stonePath.position.set(0, 2.1, 10);
  markStatic(stonePath);
  mapGroup.add(stonePath);

  // ── PRIVATE AIRCRAFT RUNWAY ──
  const runwayMesh = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 42), matRunway);
  runwayMesh.position.set(0, 1.1, 30);
  runwayMesh.receiveShadow = true;
  markStatic(runwayMesh);
  mapGroup.add(runwayMesh);
  addCollider(0, 1.1, 30, 12, 0.2, 42);

  // Runway center stripes
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });
  for (let i = 0; i < 7; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 3), stripeMat);
    stripe.position.set(0, 1.22, 14 + i * 5.2);
    markStatic(stripe);
    mapGroup.add(stripe);
  }

  // Runway amber perimeter lights
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff9900, emissiveIntensity: 2 });
  const runwayLights: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    [-6.5, 6.5].forEach(lx => {
      const rl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), lightMat);
      rl.position.set(lx, 1.35, 12 + i * 4.4);
      runwayLights.push(rl);
      mapGroup.add(rl);
    });
  }

  // ── HELIPAD ──
  const helipadBase = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.2, 16), matRunway);
  helipadBase.position.set(-32, 1.1, 10);
  markStatic(helipadBase);
  mapGroup.add(helipadBase);
  addCollider(-32, 1.1, 10, 9, 0.2, 9);

  const helipadRing = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.02, 16), new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.6 }));
  helipadRing.position.set(-32, 1.22, 10);
  markStatic(helipadRing);
  mapGroup.add(helipadRing);

  // ── PALM TREE GROVES ──
  const palmCoords = [
    [-22, 5], [22, 8], [-32, 18], [32, 15], [-16, 32], [16, 28],
    [-42, 0], [42, -5], [-26, -6], [26, -2], [0, 36]
  ];
  palmCoords.forEach(([px, pz], idx) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 6.5, 8), matWood);
    trunk.position.set(px, 4.25, pz);
    trunk.rotation.z = (idx % 3 - 1) * 0.08;
    trunk.castShadow = true;
    markStatic(trunk);
    mapGroup.add(trunk);
    const stemRadius = 0.22;
    colliders.push({
      minX: px - stemRadius,
      maxX: px + stemRadius,
      minZ: pz - stemRadius,
      maxZ: pz + stemRadius,
      top: 2.5,
      bottom: -1.0,
      isCylinder: true,
      centerX: px,
      centerZ: pz,
      radius: stemRadius
    });

    const fronds = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 8), matPalmLeaves);
    fronds.position.set(px, 7.8, pz);
    fronds.scale.set(1.4, 0.5, 1.4);
    fronds.castShadow = true;
    markStatic(fronds);
    mapGroup.add(fronds);
  });

  // ── GARDEN GAZEBO ──
  const gazeboGroup = new THREE.Group();
  gazeboGroup.position.set(30, 2.0, 4);
  mapGroup.add(gazeboGroup);

  const gazeboRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 3.6, 1.4, 8), matMansionRoof);
  gazeboRoof.position.set(0, 3.2, 0);
  gazeboRoof.castShadow = true;
  markStatic(gazeboRoof);
  gazeboGroup.add(gazeboRoof);
  addCollider(30, 3.0, 4, 7, 3, 7);

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), matStone);
    post.position.set(Math.cos(angle) * 3, 1.2, Math.sin(angle) * 3);
    markStatic(post);
    gazeboGroup.add(post);
  }

  // ── LUXURY YACHTS AT SHORE ──
  const yachtConfigs = [
    { pos: [54, 0, 18], rot: 0.3 },
    { pos: [-48, 0, 26], rot: -0.25 },
    { pos: [38, 0, -38], rot: 1.15 }
  ];
  yachtConfigs.forEach(({ pos, rot }) => {
    const yGroup = new THREE.Group();
    yGroup.position.set(pos[0], pos[1], pos[2]);
    yGroup.rotation.y = rot;
    mapGroup.add(yGroup);

    const yHullMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const yHull = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.4, 11), yHullMat);
    yHull.position.set(0, 0.5, 0);
    yHull.castShadow = true;
    yGroup.add(yHull);
    addCollider(pos[0], 1.0, pos[2], 5, 2, 11);

    const yCabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 4.5), yHullMat);
    yCabin.position.set(0, 1.9, -0.6);
    yCabin.castShadow = true;
    yGroup.add(yCabin);
  });

  return {
    update: (_delta: number, elapsed: number) => {
      // Gentle ocean surface movement
      if (oceanSurface) {
        oceanSurface.position.y = -0.4 + Math.sin(elapsed * 1.5) * 0.08;
      }
      // Runway light subtle pulse
      const pulse = 1.6 + Math.sin(elapsed * 3) * 0.6;
      lightMat.emissiveIntensity = pulse;
    }
  };
}
