import * as THREE from 'three';
import { Collider, HeightAtFunction } from './mapTypes';
import { UpgradedMapResult } from './mapBuilder';
import { createWetCobblestoneTexture, createDetailedBuildingFacade } from './mapTextures';
import { loadBuildingModel, instantiateBuilding, registerBoxCollider } from './glbModelLoader';

/**
 * Osaka Dotonbori Cyberpunk & Traditional Japanese District Map (Deadshot Edition)
 * Features the central Dotonbori canal waterway, arched bridges, Glico running man sign,
 * imported 3D storefront buildings, varied architectural street buildings, Shinto Torii gate,
 * hanging lanterns, streetlamps, benches, and tactical alleyway cover.
 */
export function buildOsakaMap(
  scene: THREE.Scene,
  colliders: Collider[],
  _heightAt: HeightAtFunction,
  _halfW: number,
  _halfD: number
): UpgradedMapResult {
  const mapGroup = new THREE.Group();
  scene.add(mapGroup);

  function markStatic(mesh: THREE.Object3D) {
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
  }

  // --- Shared PBR Materials ---
  const texCobbles = createWetCobblestoneTexture();
  const matGround = new THREE.MeshStandardMaterial({
    map: texCobbles,
    roughness: 0.65,
    metalness: 0.25
  });
  const matCanalWall = new THREE.MeshStandardMaterial({ color: 0x222630, roughness: 0.85, metalness: 0.12 });
  const matWater = new THREE.MeshStandardMaterial({
    color: 0x072535,
    emissive: 0x051b26,
    emissiveIntensity: 0.25,
    roughness: 0.1,
    metalness: 0.5,
    transparent: true,
    opacity: 0.88
  });
  const matBridge = new THREE.MeshStandardMaterial({ color: 0x363a45, roughness: 0.7, metalness: 0.25 });
  const matTorii = new THREE.MeshStandardMaterial({ color: 0xcc2418, roughness: 0.6, metalness: 0.15 });
  const matWoodDark = new THREE.MeshStandardMaterial({ color: 0x2e1f18, roughness: 0.85, metalness: 0.05 });
  const matCrate = new THREE.MeshStandardMaterial({ color: 0x7a5b3a, roughness: 0.8, metalness: 0.1 });
  const matMetalCover = new THREE.MeshStandardMaterial({ color: 0x2c3340, roughness: 0.5, metalness: 0.7 });

  // ── 1. CANAL WATERWAY & STREET PROMENADES ──
  // North Street Promenade (Z: -7 to -49)
  const northStreet = new THREE.Mesh(new THREE.BoxGeometry(140, 0.8, 42), matGround);
  northStreet.position.set(0, -0.4, -28);
  northStreet.receiveShadow = true;
  markStatic(northStreet);
  mapGroup.add(northStreet);
  registerBoxCollider(colliders, 0, -0.4, -28, 140, 0.8, 42);

  // South Street Promenade (Z: 7 to 49)
  const southStreet = new THREE.Mesh(new THREE.BoxGeometry(140, 0.8, 42), matGround);
  southStreet.position.set(0, -0.4, 28);
  southStreet.receiveShadow = true;
  markStatic(southStreet);
  mapGroup.add(southStreet);
  registerBoxCollider(colliders, 0, -0.4, 28, 140, 0.8, 42);

  // Dotonbori Canal Water (Y = -5.2, Depth = 14m)
  const canalWater = new THREE.Mesh(new THREE.BoxGeometry(140, 1.0, 14), matWater);
  canalWater.position.set(0, -5.2, 0);
  canalWater.receiveShadow = true;
  mapGroup.add(canalWater);
  registerBoxCollider(colliders, 0, -5.2, 0, 140, 1.0, 14);

  // Canal Retaining Walls (North & South)
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(140, 5.2, 1.2), matCanalWall);
  wallN.position.set(0, -2.6, -7.5);
  markStatic(wallN);
  mapGroup.add(wallN);
  registerBoxCollider(colliders, 0, -2.6, -7.5, 140, 5.2, 1.2);

  const wallS = new THREE.Mesh(new THREE.BoxGeometry(140, 5.2, 1.2), matCanalWall);
  wallS.position.set(0, -2.6, 7.5);
  markStatic(wallS);
  mapGroup.add(wallS);
  registerBoxCollider(colliders, 0, -2.6, 7.5, 140, 5.2, 1.2);

  // Canal Safety Balustrades / Railings along the walkway edge
  [-7.1, 7.1].forEach((rz) => {
    const handrail = new THREE.Mesh(
      new THREE.BoxGeometry(138, 0.9, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x485060, roughness: 0.5, metalness: 0.6 })
    );
    handrail.position.set(0, 0.45, rz);
    handrail.castShadow = true;
    markStatic(handrail);
    mapGroup.add(handrail);
    registerBoxCollider(colliders, 0, 0.45, rz, 138, 0.9, 0.25);
  });

  // ── 2. BRIDGES CROSSING THE CANAL ──
  const bridgeX = [-35, 0, 35];
  bridgeX.forEach(bx => {
    // Bridge Deck
    const bridgeMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 16), matBridge);
    bridgeMesh.position.set(bx, 0.3, 0);
    bridgeMesh.receiveShadow = true;
    bridgeMesh.castShadow = true;
    markStatic(bridgeMesh);
    mapGroup.add(bridgeMesh);
    registerBoxCollider(colliders, bx, 0.3, 0, 8, 0.6, 16);

    // Bridge Guardrails (Torii Red)
    [-4.1, 4.1].forEach(rx => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 16), matTorii);
      rail.position.set(bx + rx, 1.05, 0);
      rail.castShadow = true;
      markStatic(rail);
      mapGroup.add(rail);
      registerBoxCollider(colliders, bx + rx, 1.05, 0, 0.3, 1.1, 16);
    });
  });

  // ── 3. GLICO RUNNING MAN ICONIC BILLBOARD (Center North) ──
  const glicoGroup = new THREE.Group();
  glicoGroup.position.set(0, 13, -42);
  mapGroup.add(glicoGroup);

  const glicoBackdrop = new THREE.Mesh(
    new THREE.BoxGeometry(20, 15, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x0f4fb8, roughness: 0.3, metalness: 0.2 })
  );
  markStatic(glicoBackdrop);
  glicoGroup.add(glicoBackdrop);

  // Red running track arc
  const trackMat = new THREE.MeshStandardMaterial({ color: 0xdd1a1a, emissive: 0xaa1010, emissiveIntensity: 0.7 });
  const glicoTrack = new THREE.Mesh(new THREE.BoxGeometry(18, 2.4, 0.6), trackMat);
  glicoTrack.position.set(0, -4.8, 0.1);
  glicoGroup.add(glicoTrack);

  // Stylized White Neon Runner
  const runnerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xccffff, emissiveIntensity: 1.5 });
  const runnerTorso = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.0, 0.4), runnerMat);
  runnerTorso.position.set(0, 0.6, 0.25);
  const runnerHead = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 12), runnerMat);
  runnerHead.position.set(0, 4.2, 0.25);
  const runnerArmL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 3.6, 0.4), runnerMat);
  runnerArmL.position.set(-2.4, 2.4, 0.25);
  runnerArmL.rotation.z = 0.55;
  const runnerArmR = new THREE.Mesh(new THREE.BoxGeometry(1.0, 3.6, 0.4), runnerMat);
  runnerArmR.position.set(2.4, 2.4, 0.25);
  runnerArmR.rotation.z = -0.55;
  glicoGroup.add(runnerTorso, runnerHead, runnerArmL, runnerArmR);

  // Backing collider for Glico billboard structure
  registerBoxCollider(colliders, 0, 13, -42, 20, 15, 2.0);

  // ── 4. BUILDINGS: IMPORTED 3D GLB & VARIED ARCHITECTURAL BUILDINGS ──
  const buildingGroup = new THREE.Group();
  buildingGroup.name = 'Osaka_Buildings';
  mapGroup.add(buildingGroup);

  // A) IMPORTED 3D BUILDINGS (From user's GLB asset, clean with NO labels & NO flat black boxes)
  interface GlbShopDef {
    x: number;
    z: number;
    rotationY: number;
    scale: [number, number, number];
  }

  const glbShopConfigs: GlbShopDef[] = [
    // North Street West Corner Store
    { x: -50, z: -32, rotationY: 0, scale: [2.3, 2.5, 2.3] },
    // North Street East Corner Store
    { x:  50, z: -32, rotationY: 0, scale: [2.4, 2.4, 2.4] },
    // South Street Canal Boutique Shop
    { x: -24, z:  32, rotationY: Math.PI, scale: [2.2, 2.7, 2.2] },
    // South Street East Corner Store
    { x:  48, z:  32, rotationY: Math.PI, scale: [2.3, 2.5, 2.3] }
  ];

  glbShopConfigs.forEach(shop => {
    const baseW = 5.44 * shop.scale[0];
    const baseH = 6.35 * shop.scale[1];
    const baseD = 6.99 * shop.scale[2];

    // Solid collision boundary
    registerBoxCollider(colliders, shop.x, baseH / 2, shop.z, baseW, baseH, baseD);
  });

  // Asynchronously mount the clean 3D GLB model
  loadBuildingModel()
    .then((buildingTemplate) => {
      glbShopConfigs.forEach(shop => {
        const dummyColliders: Collider[] = [];
        const instance = instantiateBuilding(buildingTemplate, {
          x: shop.x,
          y: 0,
          z: shop.z,
          rotationY: shop.rotationY,
          scale: shop.scale,
          colliders: dummyColliders, // already registered
          parentGroup: buildingGroup
        });
        instance.traverse(c => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
      });
    })
    .catch((err) => {
      console.warn('Building model loader issue', err);
    });

  // B) VARIED ARCHITECTURAL BUILDINGS (Breaking visual monotony with distinct heights & textures)
  interface ArchBuildingDef {
    x: number;
    z: number;
    w: number;
    h: number;
    d: number;
    wallColor: string;
    windowColor: string;
  }

  const archConfigs: ArchBuildingDef[] = [
    // North mid-west 4-story commercial building
    { x: -24, z: -34, w: 18, h: 23, d: 18, wallColor: '#1c212d', windowColor: '#00e5ff' },
    // North mid-east 3-story office structure
    { x:  24, z: -34, w: 18, h: 25, d: 18, wallColor: '#222836', windowColor: '#ffdd00' },
    // South west mid-rise tower
    { x: -50, z:  34, w: 20, h: 22, d: 18, wallColor: '#1e2430', windowColor: '#ff9500' },
    // South central-east modern tower
    { x:  22, z:  34, w: 19, h: 26, d: 18, wallColor: '#191e2b', windowColor: '#39ff14' }
  ];

  archConfigs.forEach(b => {
    const tex = createDetailedBuildingFacade(b.wallColor, b.windowColor, 0.6);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.75,
      metalness: 0.2
    });

    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    bMesh.position.set(b.x, b.h / 2, b.z);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    markStatic(bMesh);
    buildingGroup.add(bMesh);
    registerBoxCollider(colliders, b.x, b.h / 2, b.z, b.w, b.h, b.d);

    // Decorative roof parapet
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 0.8, 0.6, b.d + 0.8),
      new THREE.MeshStandardMaterial({ color: 0x141822, roughness: 0.85 })
    );
    parapet.position.set(b.x, b.h + 0.3, b.z);
    markStatic(parapet);
    buildingGroup.add(parapet);
  });

  // ── 5. GRAND SHINTO TORII GATE (South Center, Z = 16) ──
  const toriiGroup = new THREE.Group();
  toriiGroup.position.set(0, 0, 16);
  mapGroup.add(toriiGroup);

  // Twin vertical pillars
  [-4.0, 4.0].forEach(tx => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 8.5, 12), matTorii);
    post.position.set(tx, 4.25, 0);
    post.castShadow = true;
    markStatic(post);
    toriiGroup.add(post);
    registerBoxCollider(colliders, tx, 4.25, 16, 1.2, 8.5, 1.2);
  });

  // Top curved horizontal crossbeams (Kasagi & Shimaki)
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.7, 1.0), matTorii);
  kasagi.position.set(0, 8.4, 0);
  kasagi.castShadow = true;
  markStatic(kasagi);
  toriiGroup.add(kasagi);

  const nuki = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.5, 0.8), matTorii);
  nuki.position.set(0, 7.1, 0);
  markStatic(nuki);
  toriiGroup.add(nuki);

  // ── 6. HANGING RED CHOCHIN LANTERNS ──
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xff3b20,
    emissive: 0xff2200,
    emissiveIntensity: 2.2
  });
  const lanternPositions = [
    [-34, 3.4, -18], [-34, 3.4, -12], [-1, 3.4, -18], [1, 3.4, -18],
    [34, 3.4, -18], [34, 3.4, -12], [-2, 7.8, 16], [2, 7.8, 16],
    [-24, 3.4, 18], [24, 3.4, 18], [-12, 3.4, 18], [12, 3.4, 18]
  ];
  lanternPositions.forEach(([lx, ly, lz]) => {
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.85, 10), lanternMat);
    lantern.position.set(lx, ly, lz);
    mapGroup.add(lantern);
  });

  // ── 7. JAPANESE VENDING MACHINES ──
  const vmColors = [0x1864cc, 0xcc2020, 0x1ea840, 0xd47a12];
  const vmConfigs = [
    { x: -14, z: -20, rot: 0, c: vmColors[0] },
    { x: -11, z: -20, rot: 0, c: vmColors[1] },
    { x:  11, z:  20, rot: Math.PI, c: vmColors[2] },
    { x:  14, z:  20, rot: Math.PI, c: vmColors[3] },
    { x: -38, z: -20, rot: 0, c: vmColors[1] },
    { x:  38, z:  20, rot: Math.PI, c: vmColors[0] }
  ];
  vmConfigs.forEach(vm => {
    const vMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.8, 1.2),
      new THREE.MeshStandardMaterial({ color: vm.c, roughness: 0.35, metalness: 0.5 })
    );
    vMesh.position.set(vm.x, 1.4, vm.z);
    vMesh.rotation.y = vm.rot;
    vMesh.castShadow = true;
    markStatic(vMesh);
    mapGroup.add(vMesh);
    registerBoxCollider(colliders, vm.x, 1.4, vm.z, 1.6, 2.8, 1.2);

    // Glowing drink display matrix
    const dMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.5, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xccf0ff, emissiveIntensity: 1.8 })
    );
    dMesh.position.set(vm.x, 1.8, vm.rot === 0 ? vm.z + 0.6 : vm.z - 0.6);
    mapGroup.add(dMesh);
  });

  // ── 8. STREET BENCHES & PEDESTRIAN COVERS ALONG CANAL ──
  const benchPositions = [
    { x: -48, z: -10, rot: 0 },
    { x: -20, z: -10, rot: 0 },
    { x:  20, z: -10, rot: 0 },
    { x:  48, z: -10, rot: 0 },
    { x: -48, z:  10, rot: Math.PI },
    { x: -20, z:  10, rot: Math.PI },
    { x:  20, z:  10, rot: Math.PI },
    { x:  48, z:  10, rot: Math.PI }
  ];
  benchPositions.forEach(b => {
    const benchGroup = new THREE.Group();
    benchGroup.position.set(b.x, 0.45, b.z);
    benchGroup.rotation.y = b.rot;

    // Bench seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.8), matWoodDark);
    seat.castShadow = true;
    seat.receiveShadow = true;
    benchGroup.add(seat);

    // Bench backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.12), matWoodDark);
    back.position.set(0, 0.35, -0.35);
    back.castShadow = true;
    benchGroup.add(back);

    // Bench legs
    [-1.0, 1.0].forEach(lx => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.75), matMetalCover);
      leg.position.set(lx, -0.22, 0);
      leg.castShadow = true;
      benchGroup.add(leg);
    });

    markStatic(benchGroup);
    mapGroup.add(benchGroup);
    registerBoxCollider(colliders, b.x, 0.5, b.z, 2.4, 1.0, 0.8);
  });

  // ── 9. STREET LAMPS CASTING NIGHTTIME POOLS OF LIGHT ──
  const lampPositions = [
    [-52, -9], [-26, -9], [26, -9], [52, -9],
    [-52,  9], [-26,  9], [26,  9], [52,  9]
  ];
  lampPositions.forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 5.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x1f232b, roughness: 0.4, metalness: 0.8 })
    );
    pole.position.set(lx, 2.6, lz);
    pole.castShadow = true;
    markStatic(pole);
    mapGroup.add(pole);
    registerBoxCollider(colliders, lx, 2.6, lz, 0.6, 5.2, 0.6);

    // Lantern Head
    const lampHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.75, 0.65),
      new THREE.MeshStandardMaterial({
        color: 0xffe6a3,
        emissive: 0xffcc66,
        emissiveIntensity: 2.2,
        roughness: 0.2
      })
    );
    lampHead.position.set(lx, 5.3, lz);
    mapGroup.add(lampHead);
  });

  // ── 10. TACTICAL DEADSHOT ALLEYWAY COVERS (Crates & Dumpsters) ──
  const coverConfigs = [
    // North Alleyways
    { x: -38, z: -26, w: 2.2, h: 1.8, d: 2.2, mat: matCrate },
    { x: -36, z: -27, w: 1.6, h: 1.2, d: 1.6, mat: matCrate },
    { x:  38, z: -26, w: 3.2, h: 2.0, d: 1.8, mat: matMetalCover },
    // South Alleyways
    { x: -38, z:  26, w: 3.2, h: 2.0, d: 1.8, mat: matMetalCover },
    { x:  36, z:  26, w: 2.2, h: 1.8, d: 2.2, mat: matCrate },
    { x:  38, z:  27, w: 1.6, h: 1.2, d: 1.6, mat: matCrate }
  ];
  coverConfigs.forEach(cov => {
    const covMesh = new THREE.Mesh(new THREE.BoxGeometry(cov.w, cov.h, cov.d), cov.mat);
    covMesh.position.set(cov.x, cov.h / 2, cov.z);
    covMesh.castShadow = true;
    covMesh.receiveShadow = true;
    markStatic(covMesh);
    mapGroup.add(covMesh);
    registerBoxCollider(colliders, cov.x, cov.h / 2, cov.z, cov.w, cov.h, cov.d);
  });

  // ── 11. CHERRY BLOSSOM TREES (Sakura) ──
  const sakuraMat = new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.9 });
  const treeCoords = [
    [-60, 14], [-16, 14], [16, 14], [60, 14],
    [-60, -14], [-16, -14], [16, -14], [60, -14]
  ];
  treeCoords.forEach(([tx, tz]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 4.5, 8), matWoodDark);
    trunk.position.set(tx, 2.25, tz);
    trunk.castShadow = true;
    markStatic(trunk);
    mapGroup.add(trunk);
    const stemRadius = 0.22;
    colliders.push({
      minX: tx - stemRadius,
      maxX: tx + stemRadius,
      minZ: tz - stemRadius,
      maxZ: tz + stemRadius,
      top: 2.5,
      bottom: -1.0,
      isCylinder: true,
      centerX: tx,
      centerZ: tz,
      radius: stemRadius
    });

    const foliage = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 8), sakuraMat);
    foliage.scale.set(1.4, 0.7, 1.4);
    foliage.position.set(tx, 5.0, tz);
    foliage.castShadow = true;
    markStatic(foliage);
    mapGroup.add(foliage);
  });

  return {
    update: (_delta: number, elapsed: number) => {
      // Lantern breathing glow
      const breath = 1.8 + Math.sin(elapsed * 2.5) * 0.4;
      lanternMat.emissiveIntensity = breath;

      // Canal water subtle shimmer
      (canalWater.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.22 + Math.sin(elapsed * 1.5) * 0.08;
    }
  };
}
