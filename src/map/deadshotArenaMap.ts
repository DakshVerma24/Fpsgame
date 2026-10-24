import * as THREE from 'three';
import { Collider, HeightAtFunction } from './mapTypes';
import { UpgradedMapResult } from './mapBuilder';
import { loadNeighbourhoodModel, generateNeighbourhoodColliders } from './glbModelLoader';

/**
 * Modular Low-Poly Neighbourhood City Arena Map:
 * Scaled at 1.8x for realistic urban FPS scale.
 * Enclosed in dense city perimeter walls with zero white space,
 * lush low-poly street trees, planters, perimeter shop facades,
 * and tight, clean collision geometry.
 */
export function buildDeadshotArenaMap(
  scene: THREE.Scene,
  colliders: Collider[],
  _heightAt: HeightAtFunction,
  _halfW: number,
  _halfD: number,
  onModelLoaded?: () => void
): UpgradedMapResult {
  const mapGroup = new THREE.Group();
  mapGroup.name = 'Neighbourhood_Arena_Map';
  scene.add(mapGroup);

  // Snug arena bounds tailored to the 1.8x scaled neighborhood model
  const arenaHalfW = 44;
  const arenaHalfD = 38;

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

  // --- Procedural Canvas Textures for Dark Urban Look ---
  // 1. Dark Urban Tarmac Asphalt (Deep charcoal, zero white bleed)
  function createDarkAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#171a21';
    ctx.fillRect(0, 0, 512, 512);

    // Fine dark asphalt grit
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const shade = Math.floor(18 + Math.random() * 20);
      ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 4})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 18);
    return tex;
  }

  // 2. High-Tech Industrial Hazard Striping
  function createHazardTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#0f172a';
    const stripeW = 24;
    for (let x = -128; x < 256; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW + 128, 128);
      ctx.lineTo(x + 128, 128);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 1);
    return tex;
  }

  // 3. Dark Brick & Concrete City Wall Texture
  function createDarkCityWallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2d3340';
    ctx.fillRect(0, 0, 512, 256);

    // Brick rows
    const rowH = 16;
    const brickW = 32;
    for (let y = 0; y < 256; y += rowH) {
      const offsetX = (y / rowH) % 2 === 0 ? 0 : brickW / 2;
      for (let x = -brickW; x < 512 + brickW; x += brickW) {
        const shade = Math.floor(40 + Math.random() * 15);
        ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 8})`;
        ctx.fillRect(x + offsetX + 1, y + 1, brickW - 2, rowH - 2);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 4);
    return tex;
  }

  // --- Materials ---
  const matAsphalt = new THREE.MeshStandardMaterial({
    map: createDarkAsphaltTexture(),
    roughness: 0.88,
    metalness: 0.12
  });

  const matHazard = new THREE.MeshStandardMaterial({
    map: createHazardTexture(),
    roughness: 0.5,
    metalness: 0.1
  });

  const matCityWall = new THREE.MeshStandardMaterial({
    map: createDarkCityWallTexture(),
    roughness: 0.78,
    metalness: 0.15
  });

  const matSteelGrey = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.7
  });

  const matWoodPlanter = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.85,
    metalness: 0.05
  });

  const matTreeTrunk = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.9,
    metalness: 0.05
  });

  const matFoliageSakura = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.75,
    metalness: 0.05,
    flatShading: true
  });

  const matFoliageGreen = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.8,
    metalness: 0.05,
    flatShading: true
  });

  const matFoliageAutumn = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.8,
    metalness: 0.05,
    flatShading: true
  });

  // 1. BASE GROUND TARMAC (Tightly matches arena bounds, zero white space)
  const groundGeo = new THREE.PlaneGeometry(arenaHalfW * 2 + 16, arenaHalfD * 2 + 16);
  const groundMesh = new THREE.Mesh(groundGeo, matAsphalt);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(0, -0.02, 0);
  groundMesh.receiveShadow = true;
  markStatic(groundMesh);
  mapGroup.add(groundMesh);

  // 2. TIGHT PERIMETER BOUNDARY WALLS (Surrounds the 1.8x neighborhood cleanly)
  const wallH = 18;
  const wallY = wallH / 2;

  // North Boundary Wall
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(arenaHalfW * 2 + 6, wallH, 2.5), matCityWall);
  wallN.position.set(0, wallY, -arenaHalfD - 1.25);
  const wallNCap = new THREE.Mesh(new THREE.BoxGeometry(arenaHalfW * 2 + 6.2, 0.6, 2.8), matHazard);
  wallNCap.position.set(0, wallH + 0.3, -arenaHalfD - 1.25);
  wallN.castShadow = true;
  wallN.receiveShadow = true;
  markStatic(wallN);
  markStatic(wallNCap);
  mapGroup.add(wallN, wallNCap);
  addCollider(0, wallY, -arenaHalfD - 1.25, arenaHalfW * 2 + 6, wallH, 2.5);

  // South Boundary Wall
  const wallS = new THREE.Mesh(new THREE.BoxGeometry(arenaHalfW * 2 + 6, wallH, 2.5), matCityWall);
  wallS.position.set(0, wallY, arenaHalfD + 1.25);
  const wallSCap = new THREE.Mesh(new THREE.BoxGeometry(arenaHalfW * 2 + 6.2, 0.6, 2.8), matHazard);
  wallSCap.position.set(0, wallH + 0.3, arenaHalfD + 1.25);
  wallS.castShadow = true;
  wallS.receiveShadow = true;
  markStatic(wallS);
  markStatic(wallSCap);
  mapGroup.add(wallS, wallSCap);
  addCollider(0, wallY, arenaHalfD + 1.25, arenaHalfW * 2 + 6, wallH, 2.5);

  // West Boundary Wall
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(2.5, wallH, arenaHalfD * 2 + 6), matCityWall);
  wallW.position.set(-arenaHalfW - 1.25, wallY, 0);
  const wallWCap = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, arenaHalfD * 2 + 6.2), matHazard);
  wallWCap.position.set(-arenaHalfW - 1.25, wallH + 0.3, 0);
  wallW.castShadow = true;
  wallW.receiveShadow = true;
  markStatic(wallW);
  markStatic(wallWCap);
  mapGroup.add(wallW, wallWCap);
  addCollider(-arenaHalfW - 1.25, wallY, 0, 2.5, wallH, arenaHalfD * 2 + 6);

  // East Boundary Wall
  const wallE = new THREE.Mesh(new THREE.BoxGeometry(2.5, wallH, arenaHalfD * 2 + 6), matCityWall);
  wallE.position.set(arenaHalfW + 1.25, wallY, 0);
  const wallECap = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, arenaHalfD * 2 + 6.2), matHazard);
  wallECap.position.set(arenaHalfW + 1.25, wallH + 0.3, 0);
  wallE.castShadow = true;
  wallE.receiveShadow = true;
  markStatic(wallE);
  markStatic(wallECap);
  mapGroup.add(wallE, wallECap);
  addCollider(arenaHalfW + 1.25, wallY, 0, 2.5, wallH, arenaHalfD * 2 + 6);

  // 3. LOW-POLY URBAN TREES & PLANTERS (Adds foliage density & breaks sightlines)
  function spawnStreetTree(x: number, z: number, foliageType: 'sakura' | 'green' | 'autumn') {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    // Slim, compact tree grate/collar flush with pavement (tightly wraps tree stem)
    const planter = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.52), matWoodPlanter);
    planter.position.y = 0.04;
    planter.castShadow = true;
    planter.receiveShadow = true;
    treeGroup.add(planter);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.2, 12), matTreeTrunk);
    trunk.position.y = 2.1;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage crown (multi-faceted low-poly icosahedron clusters) - 100% non-colliding
    const matFol = foliageType === 'sakura' ? matFoliageSakura : foliageType === 'autumn' ? matFoliageAutumn : matFoliageGreen;
    const f1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 0), matFol);
    f1.position.set(0, 4.4, 0);
    f1.castShadow = true;

    const f2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 0), matFol);
    f2.position.set(0.6, 5.2, -0.4);
    f2.castShadow = true;

    const f3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), matFol);
    f3.position.set(-0.5, 5.0, 0.5);
    f3.castShadow = true;

    treeGroup.add(f1, f2, f3);
    markStatic(treeGroup);
    mapGroup.add(treeGroup);

    // Slim 0.22m radius cylinder collider covering ONLY the tree stem (leaves above are 100% walk-through)
    const stemRadius = 0.22; // 0.18m - 0.24m radius cylinder
    colliders.push({
      minX: x - stemRadius,
      maxX: x + stemRadius,
      minZ: z - stemRadius,
      maxZ: z + stemRadius,
      top: 2.4,
      bottom: -1.0,
      isCylinder: true,
      centerX: x,
      centerZ: z,
      radius: stemRadius
    });
  }

  // Scatter trees strictly along perimeter sidewalks and wide avenues
  const treePositions: [number, number, 'sakura' | 'green' | 'autumn'][] = [
    [-38, -26, 'sakura'],
    [-38, 26, 'green'],
    [38, -26, 'autumn'],
    [38, 26, 'sakura'],
    [-24, -32, 'green'],
    [0, -32, 'sakura'],
    [24, -32, 'autumn'],
    [-24, 32, 'autumn'],
    [0, 32, 'green'],
    [24, 32, 'sakura'],
    [-19, -14, 'sakura'],
    [18, -14, 'green'],
    [-19, 14, 'autumn'],
    [18, 14, 'sakura']
  ];

  treePositions.forEach(([tx, tz, type]) => {
    spawnStreetTree(tx, tz, type);
  });

  // 4. TEAM SPAWN GATES & TACTICAL ENTRANCE PYLONS (Open & Unobstructed)
  // West Entrance (Red Spawn)
  const redGate = new THREE.Group();
  redGate.position.set(-arenaHalfW + 3, 0, 0);
  const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, metalness: 0.3 });
  const redPylon1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.0, 0.8), redMat);
  redPylon1.position.set(0, 2.0, -12);
  redPylon1.castShadow = true;
  const redPylon2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.0, 0.8), redMat);
  redPylon2.position.set(0, 2.0, 12);
  redPylon2.castShadow = true;
  redGate.add(redPylon1, redPylon2);
  markStatic(redGate);
  mapGroup.add(redGate);

  // East Entrance (Blue Spawn)
  const blueGate = new THREE.Group();
  blueGate.position.set(arenaHalfW - 3, 0, 0);
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5, metalness: 0.3 });
  const bluePylon1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.0, 0.8), blueMat);
  bluePylon1.position.set(0, 2.0, -12);
  bluePylon1.castShadow = true;
  const bluePylon2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.0, 0.8), blueMat);
  bluePylon2.position.set(0, 2.0, 12);
  bluePylon2.castShadow = true;
  blueGate.add(bluePylon1, bluePylon2);
  markStatic(blueGate);
  mapGroup.add(blueGate);

  // 5. ASYNCHRONOUS LOAD OF 3D MODULAR NEIGHBOURHOOD GLB (Scaled 1.8x)
  const cityContainer = new THREE.Group();
  cityContainer.name = 'Neighbourhood_3D_Container';
  mapGroup.add(cityContainer);

  loadNeighbourhoodModel()
    .then((modelTemplate) => {
      const cityInstance = modelTemplate.clone(true);
      // Scaled to 1.8x as requested by user for authentic urban FPS density & scale
      cityInstance.scale.set(1.8, 1.8, 1.8);
      cityInstance.position.set(0, 0, 0);

      // Extract accurate physics colliders with light/wire filtering and strict bounds
      generateNeighbourhoodColliders(cityInstance, colliders);

      cityInstance.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          m.matrixAutoUpdate = false;
          m.updateMatrix();
        }
      });

      cityContainer.add(cityInstance);

      if (onModelLoaded) {
        onModelLoaded();
      }

      window.dispatchEvent(new CustomEvent('map-model-ready', { detail: { mapId: 'DEADSHOT_ARENA' } }));
    })
    .catch((err) => {
      console.warn('Could not load 3D neighbourhood model, keeping tactical street base:', err);
      if (onModelLoaded) {
        onModelLoaded();
      }
      window.dispatchEvent(new CustomEvent('map-model-ready', { detail: { mapId: 'DEADSHOT_ARENA' } }));
    });

  return {
    update: (_delta: number, _elapsed: number) => {
      // Runs at smooth 60+ FPS
    },
    holoGemMesh: null
  };
}

export const buildNeighbourhoodMap = buildDeadshotArenaMap;
