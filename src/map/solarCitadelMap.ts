import * as THREE from 'three';
import { Collider, HeightAtFunction } from './mapTypes';
import { UpgradedMapResult } from './mapBuilder';
import {
  createSolarSandstonePavingTexture,
  createSolarBuildingFacadeTexture,
  createPhotovoltaicPanelTexture,
  createSolarCitadelBannerTexture
} from './mapTextures';

export function buildSolarCitadelMap(
  scene: THREE.Scene,
  colliders: Collider[],
  heightAt: HeightAtFunction,
  halfW: number,
  halfD: number
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

  // --- Procedural Canvas Textures (Cached singletons in mapTextures) ---
  const texPaving = createSolarSandstonePavingTexture();
  texPaving.repeat.set(16, 14);

  const texYellowFacade = createSolarBuildingFacadeTexture('#deb44c', '#ffd700');
  texYellowFacade.repeat.set(2, 4);

  const texTerracottaFacade = createSolarBuildingFacadeTexture('#b55222', '#ffaa00');
  texTerracottaFacade.repeat.set(2, 4);

  const texSolarPanel = createPhotovoltaicPanelTexture();
  texSolarPanel.repeat.set(1, 1);

  const texBannerAlpha = createSolarCitadelBannerTexture('ALPHA GATE');
  const texBannerBravo = createSolarCitadelBannerTexture('BRAVO GATE');
  const texBannerHelios = createSolarCitadelBannerTexture('SOLAR SANCTUM');

  // --- Shared PBR Materials ---
  const matPavement = new THREE.MeshStandardMaterial({
    map: texPaving,
    roughness: 0.82,
    metalness: 0.08
  });

  const matTravertine = new THREE.MeshStandardMaterial({
    color: 0xdeb44c,
    roughness: 0.72,
    metalness: 0.12
  });

  const matTerracotta = new THREE.MeshStandardMaterial({
    map: texTerracottaFacade,
    roughness: 0.75,
    metalness: 0.1
  });

  const matYellowStucco = new THREE.MeshStandardMaterial({
    map: texYellowFacade,
    roughness: 0.72,
    metalness: 0.1
  });

  const matInteriorFloor = new THREE.MeshStandardMaterial({
    color: 0xc49b45,
    roughness: 0.65,
    metalness: 0.2
  });

  const matInteriorWall = new THREE.MeshStandardMaterial({
    color: 0xecd79b,
    roughness: 0.8,
    metalness: 0.05
  });

  const matBronzeMetal = new THREE.MeshStandardMaterial({
    color: 0x423627,
    roughness: 0.38,
    metalness: 0.85
  });

  const matVibrantYellow = new THREE.MeshStandardMaterial({
    color: 0xffd000,
    roughness: 0.28,
    metalness: 0.3,
    emissive: 0xffaa00,
    emissiveIntensity: 0.4
  });

  const matSolarGold = new THREE.MeshStandardMaterial({
    color: 0xffbe0b,
    roughness: 0.22,
    metalness: 0.85,
    emissive: 0xd48800,
    emissiveIntensity: 0.35
  });

  const matDarkSteel = new THREE.MeshStandardMaterial({
    color: 0x1e232d,
    roughness: 0.45,
    metalness: 0.85
  });

  const matSolarPanel = new THREE.MeshStandardMaterial({
    map: texSolarPanel,
    roughness: 0.18,
    metalness: 0.92
  });

  const matWater = new THREE.MeshStandardMaterial({
    color: 0x0a8fa8,
    roughness: 0.08,
    metalness: 0.85,
    transparent: true,
    opacity: 0.88
  });

  const matFoliage = new THREE.MeshStandardMaterial({
    color: 0x24753c,
    roughness: 0.85,
    metalness: 0.08
  });

  const matWood = new THREE.MeshStandardMaterial({
    color: 0x54371f,
    roughness: 0.8
  });

  const matBannerAlpha = new THREE.MeshStandardMaterial({
    map: texBannerAlpha,
    roughness: 0.65,
    side: THREE.DoubleSide
  });

  const matBannerBravo = new THREE.MeshStandardMaterial({
    map: texBannerBravo,
    roughness: 0.65,
    side: THREE.DoubleSide
  });

  const matBannerHelios = new THREE.MeshStandardMaterial({
    map: texBannerHelios,
    roughness: 0.65,
    side: THREE.DoubleSide
  });

  // 1. TERRAIN / SUN-BLEACHED GROUND
  const groundGeo = new THREE.PlaneGeometry(halfW * 2, halfD * 2, 48, 36);
  groundGeo.rotateX(-Math.PI / 2);
  const posAttr = groundGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const gx = posAttr.getX(i);
    const gz = posAttr.getZ(i);
    posAttr.setY(i, heightAt(gx, gz));
  }
  groundGeo.computeVertexNormals();

  const groundMesh = new THREE.Mesh(groundGeo, matPavement);
  groundMesh.receiveShadow = true;
  markStatic(groundMesh);
  mapGroup.add(groundMesh);

  // 2. CENTRAL SUNKEN SUN AMPHITHEATER & FOUNTAIN
  const plazaCenterY = heightAt(0, 0);
  const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.0, 0.6, 24), matTravertine);
  fountainBase.position.set(0, plazaCenterY + 0.3, 0);
  fountainBase.receiveShadow = true;
  markStatic(fountainBase);
  mapGroup.add(fountainBase);

  // Stepped amphitheater concentric tier rings (Walkable step tiers)
  const tierRingOuter = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 12.0, 0.25, 28), matTravertine);
  tierRingOuter.position.set(0, plazaCenterY + 0.125, 0);
  tierRingOuter.receiveShadow = true;
  markStatic(tierRingOuter);
  mapGroup.add(tierRingOuter);

  const fountainRim = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.18, 8, 32), matVibrantYellow);
  fountainRim.rotation.x = Math.PI / 2;
  fountainRim.position.set(0, plazaCenterY + 0.62, 0);
  markStatic(fountainRim);
  mapGroup.add(fountainRim);

  const waterPool = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 0.1, 24), matWater);
  waterPool.position.set(0, plazaCenterY + 0.58, 0);
  mapGroup.add(waterPool);

  // Central Solar Obelisk / Heliostat Tower
  const obeliskBase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 3.6), matBronzeMetal);
  obeliskBase.position.set(0, plazaCenterY + 0.9, 0);
  mapGroup.add(obeliskBase);
  addCollider(0, plazaCenterY + 0.9, 0, 3.6, 1.2, 3.6);

  const obeliskTrim = new THREE.Mesh(new THREE.BoxGeometry(3.75, 0.2, 3.75), matVibrantYellow);
  obeliskTrim.position.set(0, plazaCenterY + 1.45, 0);
  mapGroup.add(obeliskTrim);

  const obeliskSpire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 10, 6), matYellowStucco);
  obeliskSpire.position.set(0, plazaCenterY + 6.2, 0);
  obeliskSpire.castShadow = true;
  markStatic(obeliskSpire);
  mapGroup.add(obeliskSpire);
  addCollider(0, plazaCenterY + 6.2, 0, 2.8, 10, 2.8);

  [3.5, 6.5, 9.0].forEach((ringH) => {
    const ringRadius = 1.6 * (1 - (ringH - 1.2) / 10);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(ringRadius + 0.05, ringRadius + 0.05, 0.2, 8), matVibrantYellow);
    ring.position.set(0, plazaCenterY + ringH, 0);
    markStatic(ring);
    mapGroup.add(ring);
  });

  // Floating Rotating Sun Gem & Solar Rings
  const sunGemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.3, 0), matSolarGold);
  sunGemMesh.position.set(0, plazaCenterY + 12.0, 0);
  mapGroup.add(sunGemMesh);

  const ringGeo1 = new THREE.TorusGeometry(2.1, 0.08, 6, 24);
  const ring1 = new THREE.Mesh(ringGeo1, matVibrantYellow);
  ring1.position.set(0, plazaCenterY + 12.0, 0);
  mapGroup.add(ring1);

  const ringGeo2 = new THREE.TorusGeometry(2.8, 0.06, 6, 24);
  const ring2 = new THREE.Mesh(ringGeo2, matSolarGold);
  ring2.position.set(0, plazaCenterY + 12.0, 0);
  ring2.rotation.x = Math.PI / 4;
  mapGroup.add(ring2);

  // Heliostat Solar Mirrors surrounding the base
  for (let m = 0; m < 6; m++) {
    const angle = (m / 6) * Math.PI * 2;
    const mx = Math.cos(angle) * 5.2;
    const mz = Math.sin(angle) * 5.2;
    const my = plazaCenterY + 0.6;

    const mirrorStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), matBronzeMetal);
    mirrorStand.position.set(mx, my + 0.6, mz);
    const mirrorPlate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.08), matSolarPanel);
    mirrorPlate.position.set(mx, my + 1.2, mz);
    mirrorPlate.lookAt(0, plazaCenterY + 12.0, 0);

    const mirrorTrim = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.1), matVibrantYellow);
    mirrorTrim.position.set(mx, my + 1.68, mz);
    mirrorTrim.lookAt(0, plazaCenterY + 12.0, 0);

    mapGroup.add(mirrorStand, mirrorPlate, mirrorTrim);
    addCollider(mx, my + 0.6, mz, 1.4, 1.4, 1.4);
  }

  // 3. ENTERABLE BUILDINGS WITH INTERIORS & TACTICAL MEZZANINES
  // (Provides close-quarter duels, camper holding spots, and sniper mezzanine overlooks)
  function buildEnterableCourtyardBuilding(
    bx: number,
    bz: number,
    bw: number,
    bd: number,
    bh: number,
    doorNorth: boolean
  ) {
    const by = heightAt(bx, bz);
    const wallThick = 0.75;
    const doorW = 4.2;
    const doorH = 3.6;

    // Interior floor slab (walkable)
    const floor = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.4, bd), matInteriorFloor);
    floor.position.set(bx, by + 0.2, bz);
    markStatic(floor);
    mapGroup.add(floor);
    addCollider(bx, by + 0.2, bz, bw, 0.4, bd);

    // Ceiling / Walkable 2nd-floor sniper roof deck
    const roofY = by + bh;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.5, bd), matTravertine);
    roof.position.set(bx, roofY, bz);
    markStatic(roof);
    mapGroup.add(roof);
    addCollider(bx, roofY, bz, bw, 0.5, bd);

    // Parapet around sniper roof with firing notches
    const paraH = 1.1;
    // West & East roof railings
    const pW = new THREE.Mesh(new THREE.BoxGeometry(wallThick, paraH, bd), matVibrantYellow);
    pW.position.set(bx - bw / 2 + wallThick / 2, roofY + paraH / 2 + 0.25, bz);
    const pE = new THREE.Mesh(new THREE.BoxGeometry(wallThick, paraH, bd), matVibrantYellow);
    pE.position.set(bx + bw / 2 - wallThick / 2, roofY + paraH / 2 + 0.25, bz);
    markStatic(pW);
    markStatic(pE);
    mapGroup.add(pW, pE);
    addCollider(bx - bw / 2 + wallThick / 2, roofY + paraH / 2 + 0.25, bz, wallThick, paraH, bd);
    addCollider(bx + bw / 2 - wallThick / 2, roofY + paraH / 2 + 0.25, bz, wallThick, paraH, bd);

    // North & South outer roof parapets
    const pN = new THREE.Mesh(new THREE.BoxGeometry(bw, paraH, wallThick), matTravertine);
    pN.position.set(bx, roofY + paraH / 2 + 0.25, bz - bd / 2 + wallThick / 2);
    const pS = new THREE.Mesh(new THREE.BoxGeometry(bw, paraH, wallThick), matTravertine);
    pS.position.set(bx, roofY + paraH / 2 + 0.25, bz + bd / 2 - wallThick / 2);
    markStatic(pN);
    markStatic(pS);
    mapGroup.add(pN, pS);
    addCollider(bx, roofY + paraH / 2 + 0.25, bz - bd / 2 + wallThick / 2, bw, paraH, wallThick);
    addCollider(bx, roofY + paraH / 2 + 0.25, bz + bd / 2 - wallThick / 2, bw, paraH, wallThick);

    // Left and Right Solid Walls
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(wallThick, bh, bd), matYellowStucco);
    wallL.position.set(bx - bw / 2 + wallThick / 2, by + bh / 2, bz);
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(wallThick, bh, bd), matYellowStucco);
    wallR.position.set(bx + bw / 2 - wallThick / 2, by + bh / 2, bz);
    markStatic(wallL);
    markStatic(wallR);
    mapGroup.add(wallL, wallR);
    addCollider(bx - bw / 2 + wallThick / 2, by + bh / 2, bz, wallThick, bh, bd);
    addCollider(bx + bw / 2 - wallThick / 2, by + bh / 2, bz, wallThick, bh, bd);

    // Back Wall (Closed)
    const backZ = doorNorth ? bz + bd / 2 - wallThick / 2 : bz - bd / 2 + wallThick / 2;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, wallThick), matYellowStucco);
    backWall.position.set(bx, by + bh / 2, backZ);
    markStatic(backWall);
    mapGroup.add(backWall);
    addCollider(bx, by + bh / 2, backZ, bw, bh, wallThick);

    // Front Wall with Doorway Opening
    const frontZ = doorNorth ? bz - bd / 2 + wallThick / 2 : bz + bd / 2 - wallThick / 2;
    const sideW = (bw - doorW) / 2;
    // Front Left segment
    const frontL = new THREE.Mesh(new THREE.BoxGeometry(sideW, bh, wallThick), matYellowStucco);
    frontL.position.set(bx - bw / 2 + sideW / 2, by + bh / 2, frontZ);
    // Front Right segment
    const frontR = new THREE.Mesh(new THREE.BoxGeometry(sideW, bh, wallThick), matYellowStucco);
    frontR.position.set(bx + bw / 2 - sideW / 2, by + bh / 2, frontZ);
    // Doorway Lintel
    const lintelH = bh - doorH;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, wallThick), matVibrantYellow);
    lintel.position.set(bx, by + doorH + lintelH / 2, frontZ);

    markStatic(frontL);
    markStatic(frontR);
    markStatic(lintel);
    mapGroup.add(frontL, frontR, lintel);
    addCollider(bx - bw / 2 + sideW / 2, by + bh / 2, frontZ, sideW, bh, wallThick);
    addCollider(bx + bw / 2 - sideW / 2, by + bh / 2, frontZ, sideW, bh, wallThick);
    addCollider(bx, by + doorH + lintelH / 2, frontZ, doorW, lintelH, wallThick);

    // Interior Furniture: Tactical Camper Desk / Console & Supply Crates
    const consoleTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 1.2), matBronzeMetal);
    consoleTable.position.set(bx, by + 0.475 + 0.4, bz + (doorNorth ? 2.5 : -2.5));
    const consoleScreen = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), matVibrantYellow);
    consoleScreen.position.set(bx, by + 0.95 + 0.4 + 0.35, bz + (doorNorth ? 2.8 : -2.8));
    markStatic(consoleTable);
    markStatic(consoleScreen);
    mapGroup.add(consoleTable, consoleScreen);
    addCollider(bx, by + 0.475 + 0.4, bz + (doorNorth ? 2.5 : -2.5), 2.4, 0.95, 1.2);

    // Interior Warm Ambient Glow Light
    const roomLight = new THREE.PointLight(0xffbe0b, 1.2, 14);
    roomLight.position.set(bx, by + 3.0, bz);
    mapGroup.add(roomLight);
  }

  // Build the two enterable combat outposts on West and East lanes
  buildEnterableCourtyardBuilding(-28, 0, 10, 12, 5.2, false); // West Outpost
  buildEnterableCourtyardBuilding(28, 0, 10, 12, 5.2, false);  // East Outpost

  // 4. WALKABLE ASCENSION RAMPS & SNIPER MEZZANINES (Varying Elevation)
  // These ramps connect the ground to the skybridges and the building sniper decks
  function buildRamp(
    startX: number, startZ: number,
    endX: number, endZ: number,
    startH: number, targetH: number,
    rampW: number
  ) {
    const steps = 14;
    const dx = (endX - startX) / steps;
    const dz = (endZ - startZ) / steps;
    const stepL = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    for (let s = 0; s < steps; s++) {
      const sx = startX + dx * (s + 0.5);
      const sz = startZ + dz * (s + 0.5);
      const frac = (s + 1) / steps;
      const curH = THREE.MathUtils.lerp(startH, targetH, frac);
      const stepThick = curH - startH + 0.2;

      const step = new THREE.Mesh(new THREE.BoxGeometry(rampW, stepThick, stepL + 0.08), matTravertine);
      step.position.set(sx, startH + stepThick / 2, sz);
      step.rotation.y = angle;
      markStatic(step);
      mapGroup.add(step);
      addCollider(sx, startH + stepThick / 2, sz, rampW, stepThick, stepL + 0.08);
    }
  }

  // Ramps leading up from ground to the elevated skybridges and sniper perches
  // North Ramp (West team access)
  const yNorthRampBase = heightAt(-16, -10);
  buildRamp(-16, -10, -16, -18, yNorthRampBase, yNorthRampBase + 4.5, 3.2);

  // South Ramp (East team access)
  const ySouthRampBase = heightAt(18, 10);
  buildRamp(18, 10, 18, 18, ySouthRampBase, ySouthRampBase + 4.5, 3.2);

  // 5. SOLID MULTI-TIERED TOWERS & FAÇADES
  interface BuildingDef {
    x: number;
    z: number;
    w: number;
    h: number;
    d: number;
    theme: 'YELLOW' | 'TERRACOTTA';
  }

  const buildings: BuildingDef[] = [
    // North Row
    { x: -36, z: -27, w: 16, h: 20, d: 14, theme: 'YELLOW' },
    { x: -16, z: -28, w: 14, h: 24, d: 14, theme: 'TERRACOTTA' },
    { x: 2, z: -29, w: 16, h: 22, d: 13, theme: 'YELLOW' },
    { x: 20, z: -27, w: 15, h: 26, d: 14, theme: 'TERRACOTTA' },
    { x: 38, z: -26, w: 15, h: 18, d: 14, theme: 'YELLOW' },

    // South Row
    { x: -36, z: 27, w: 15, h: 19, d: 14, theme: 'TERRACOTTA' },
    { x: -18, z: 28, w: 14, h: 25, d: 13, theme: 'YELLOW' },
    { x: 0, z: 29, w: 16, h: 22, d: 14, theme: 'TERRACOTTA' },
    { x: 18, z: 28, w: 14, h: 27, d: 13, theme: 'YELLOW' },
    { x: 38, z: 27, w: 15, h: 20, d: 14, theme: 'TERRACOTTA' },

    // Midfield Perimeter Complexes
    { x: -14, z: -8, w: 7, h: 9, d: 8, theme: 'TERRACOTTA' },
    { x: 14, z: 8, w: 7, h: 9, d: 8, theme: 'TERRACOTTA' }
  ];

  buildings.forEach((b) => {
    const y = heightAt(b.x, b.z);
    const mainMat = b.theme === 'YELLOW' ? matYellowStucco : matTerracotta;

    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mainMat);
    bMesh.position.set(b.x, y + b.h / 2, b.z);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    markStatic(bMesh);
    mapGroup.add(bMesh);
    addCollider(b.x, y + b.h / 2, b.z, b.w, b.h, b.d);

    const fSkirt = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.4, 8, b.d + 0.4), matTravertine);
    fSkirt.position.set(b.x, y - 3.8, b.z);
    markStatic(fSkirt);
    mapGroup.add(fSkirt);

    const parapet = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.35, 0.45, b.d + 0.35), matVibrantYellow);
    parapet.position.set(b.x, y + b.h + 0.22, b.z);
    markStatic(parapet);
    mapGroup.add(parapet);

    const bandCount = Math.floor(b.h / 4);
    for (let f = 1; f < bandCount; f++) {
      const bandY = y + f * 4;
      const bandMat = (f % 2 === 0) ? matVibrantYellow : matBronzeMetal;
      const band = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.3, 0.35, b.d + 0.3), bandMat);
      band.position.set(b.x, bandY, b.z);
      markStatic(band);
      mapGroup.add(band);
    }

    const roofY = y + b.h;
    const solarCount = Math.floor((b.w - 2) / 3);
    for (let sp = 0; sp < solarCount; sp++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 2.2), matSolarPanel);
      panel.position.set(b.x - b.w / 2 + 2 + sp * 3, roofY + 0.8, b.z);
      panel.rotation.x = -0.3;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.08, 0.1), matVibrantYellow);
      frame.position.set(b.x - b.w / 2 + 2 + sp * 3, roofY + 1.25, b.z - 0.9);
      markStatic(panel);
      markStatic(frame);
      mapGroup.add(panel, frame);
    }

    const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2), matDarkSteel);
    hvac.position.set(b.x + b.w / 3, roofY + 0.7, b.z + (b.d > 10 ? 2 : 0));
    const hvacTrim = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.15, 2.25), matVibrantYellow);
    hvacTrim.position.set(b.x + b.w / 3, roofY + 1.45, b.z + (b.d > 10 ? 2 : 0));
    markStatic(hvac);
    markStatic(hvacTrim);
    mapGroup.add(hvac, hvacTrim);
  });

  // Hanging Heraldic Solar Citadel Banners
  const bannerPlacements = [
    { x: -36, y: 12, z: -19.9, rotY: 0, mat: matBannerAlpha },
    { x: 38, y: 12, z: -18.9, rotY: 0, mat: matBannerBravo },
    { x: -36, y: 12, z: 19.9, rotY: Math.PI, mat: matBannerAlpha },
    { x: 38, y: 12, z: 19.9, rotY: Math.PI, mat: matBannerBravo },
    { x: -22.9, y: 6, z: 0, rotY: Math.PI / 2, mat: matBannerHelios },
    { x: 22.9, y: 6, z: 0, rotY: -Math.PI / 2, mat: matBannerHelios }
  ];

  bannerPlacements.forEach((bp) => {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.4), bp.mat);
    const by = heightAt(bp.x, bp.z) + bp.y;
    banner.position.set(bp.x, by, bp.z);
    banner.rotation.y = bp.rotY;
    markStatic(banner);
    mapGroup.add(banner);

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), matBronzeMetal);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(bp.x, by + 2.25, bp.z);
    if (bp.rotY === Math.PI / 2 || bp.rotY === -Math.PI / 2) {
      rod.rotation.z = 0;
      rod.rotation.x = Math.PI / 2;
    }
    markStatic(rod);
    mapGroup.add(rod);
  });

  // 6. ELEVATED PEDESTRIAN SKYBRIDGES (SNIPER & FLANK HIGHWAY)
  const skybridges = [
    { x1: -16, z1: -18, x2: -14, z2: -6, w: 3.6, h: 0.6 },
    { x1: 18, z1: 18, x2: 14, z2: 6, w: 3.6, h: 0.6 }
  ];

  skybridges.forEach((sb) => {
    const midX = (sb.x1 + sb.x2) / 2;
    const midZ = (sb.z1 + sb.z2) / 2;
    const len = Math.hypot(sb.x2 - sb.x1, sb.z2 - sb.z1);
    const bridgeY = heightAt(midX, midZ) + 4.5;

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(sb.w, sb.h, len), matYellowStucco);
    bridge.position.set(midX, bridgeY, midZ);
    markStatic(bridge);
    mapGroup.add(bridge);
    addCollider(midX, bridgeY, midZ, sb.w, sb.h, len);

    // Guard rails
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, len), matVibrantYellow);
    railL.position.set(midX - sb.w / 2 + 0.1, bridgeY + sb.h / 2 + 0.45, midZ);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, len), matVibrantYellow);
    railR.position.set(midX + sb.w / 2 - 0.1, bridgeY + sb.h / 2 + 0.45, midZ);
    markStatic(railL);
    markStatic(railR);
    mapGroup.add(railL, railR);
    addCollider(midX - sb.w / 2 + 0.1, bridgeY + sb.h / 2 + 0.45, midZ, 0.2, 0.9, len);
    addCollider(midX + sb.w / 2 - 0.1, bridgeY + sb.h / 2 + 0.45, midZ, 0.2, 0.9, len);

    // Support pillars
    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 4.5, 8), matBronzeMetal);
    pillarL.position.set(midX - 1.4, bridgeY - 2.25, midZ);
    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 4.5, 8), matBronzeMetal);
    pillarR.position.set(midX + 1.4, bridgeY - 2.25, midZ);
    mapGroup.add(pillarL, pillarR);
    addCollider(midX - 1.4, bridgeY - 2.25, midZ, 0.7, 4.5, 0.7);
    addCollider(midX + 1.4, bridgeY - 2.25, midZ, 0.7, 4.5, 0.7);
  });

  // 7. CURVED LANES & TACTICAL BAZAAR CANOPIES (FAST-PACED SLIDE-DASHERS)
  const canopyConfigs = [
    { x: -14, z: 0, w: 6, d: 5, color: 0xffb703 },
    { x: 14, z: 0, w: 6, d: 5, color: 0xfb8500 },
    { x: -6, z: -12, w: 5, d: 4, color: 0xffd166 },
    { x: 6, z: 12, w: 5, d: 4, color: 0xd48800 }
  ];

  canopyConfigs.forEach((c) => {
    const cy = heightAt(c.x, c.z);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: c.color,
      roughness: 0.65,
      side: THREE.DoubleSide
    });

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(c.w, 0.1, c.d), canopyMat);
    canopy.position.set(c.x, cy + 3.4, c.z);
    canopy.rotation.z = 0.08;
    mapGroup.add(canopy);

    const poleOffsets = [
      [-c.w / 2 + 0.2, -c.d / 2 + 0.2],
      [c.w / 2 - 0.2, -c.d / 2 + 0.2],
      [-c.w / 2 + 0.2, c.d / 2 - 0.2],
      [c.w / 2 - 0.2, c.d / 2 - 0.2]
    ];
    poleOffsets.forEach(([px, pz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), matDarkSteel);
      pole.position.set(c.x + px, cy + 1.7, c.z + pz);
      mapGroup.add(pole);
    });

    const stall = new THREE.Mesh(new THREE.BoxGeometry(c.w - 1.2, 1.1, c.d - 1.6), matWood);
    stall.position.set(c.x, cy + 0.55, c.z);
    markStatic(stall);
    mapGroup.add(stall);
    addCollider(c.x, cy + 0.55, c.z, c.w - 1.2, 1.1, c.d - 1.6);
  });

  // Date Palm Planters (Flank Cover & Ambush Corners)
  const palmSpots = [
    { x: -38, z: -10 }, { x: -38, z: 10 },
    { x: -22, z: -16 }, { x: -22, z: 16 },
    { x: -8, z: -18 },  { x: -8, z: 18 },
    { x: 8, z: -18 },   { x: 8, z: 18 },
    { x: 22, z: -16 },  { x: 22, z: 16 },
    { x: 38, z: -10 },  { x: 38, z: 10 }
  ];

  palmSpots.forEach((ps) => {
    const py = heightAt(ps.x, ps.z);
    const planter = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.52), matTravertine);
    planter.position.set(ps.x, py + 0.04, ps.z);
    markStatic(planter);
    mapGroup.add(planter);

    const pTrim = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.56), matVibrantYellow);
    pTrim.position.set(ps.x, py + 0.08, ps.z);
    markStatic(pTrim);
    mapGroup.add(pTrim);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 5.5, 8), matWood);
    trunk.position.set(ps.x, py + 2.75, ps.z);
    trunk.rotation.z = (Math.random() - 0.5) * 0.12;
    mapGroup.add(trunk);

    // Slim 0.22m radius cylinder collider covering ONLY the palm tree stem (leaves above are 100% walk-through)
    const stemRadius = 0.22;
    colliders.push({
      minX: ps.x - stemRadius,
      maxX: ps.x + stemRadius,
      minZ: ps.z - stemRadius,
      maxZ: ps.z + stemRadius,
      top: py + 2.5,
      bottom: py - 1.0,
      isCylinder: true,
      centerX: ps.x,
      centerZ: ps.z,
      radius: stemRadius
    });

    const fronds = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.8, 7), matFoliage);
    fronds.position.set(ps.x, py + 6.0, ps.z);
    const frondsLower = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.2, 7), matFoliage);
    frondsLower.position.set(ps.x, py + 5.2, ps.z);
    frondsLower.rotation.y = 0.45;
    mapGroup.add(fronds, frondsLower);
  });

  // Staggered Curving Tactical Barriers (Creates S-curve chokepoints for fast-paced pushers)
  const barrierDefs = [
    { x: -24, z: -6, rot: 0.35 }, { x: -24, z: 6, rot: -0.35 },
    { x: -10, z: -4, rot: 0.45 }, { x: -10, z: 4, rot: -0.45 },
    { x: 10, z: -4, rot: -0.45 }, { x: 10, z: 4, rot: 0.45 },
    { x: 24, z: -6, rot: -0.35 }, { x: 24, z: 6, rot: 0.35 },
    // Center ring chicane barriers
    { x: -4, z: -5.5, rot: 0.8 }, { x: 4, z: 5.5, rot: -0.8 }
  ];

  barrierDefs.forEach((b) => {
    const by = heightAt(b.x, b.z);
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 0.6), matTravertine);
    barrier.position.set(b.x, by + 0.57, b.z);
    barrier.rotation.y = b.rot;
    markStatic(barrier);

    const topCap = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.15, 0.62), matVibrantYellow);
    topCap.position.set(b.x, by + 1.15 + 0.075, b.z);
    topCap.rotation.y = b.rot;
    markStatic(topCap);

    mapGroup.add(barrier, topCap);
    addCollider(b.x, by + 0.57, b.z, 3.0, 1.15, 1.2);
  });

  // Solar Energy Power Node Bollards
  const bollardSpots = [
    { x: -18, z: -10 }, { x: -18, z: 10 },
    { x: 18, z: -10 },  { x: 18, z: 10 },
    { x: 0, z: -14 },   { x: 0, z: 14 }
  ];

  bollardSpots.forEach((bs) => {
    const by = heightAt(bs.x, bs.z);
    const bollardBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.0, 8), matBronzeMetal);
    bollardBase.position.set(bs.x, by + 0.5, bs.z);
    const bollardRing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.15, 8), matVibrantYellow);
    bollardRing.position.set(bs.x, by + 0.85, bs.z);
    const bollardCap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), matSolarGold);
    bollardCap.position.set(bs.x, by + 1.05, bs.z);

    markStatic(bollardBase);
    markStatic(bollardRing);
    markStatic(bollardCap);
    mapGroup.add(bollardBase, bollardRing, bollardCap);
    addCollider(bs.x, by + 0.5, bs.z, 0.6, 1.1, 0.6);
  });

  // Civilian Mag-Lev Solar Speeders
  const vehicleSpots = [
    { x: -32, z: -14, rot: 0.3, color: 0xffb703 },
    { x: 32, z: 14, rot: -0.3, color: 0xf39c12 }
  ];

  vehicleSpots.forEach((v) => {
    const vy = heightAt(v.x, v.z);
    const carMat = new THREE.MeshStandardMaterial({
      color: v.color,
      roughness: 0.3,
      metalness: 0.7
    });

    const carGroup = new THREE.Group();
    carGroup.position.set(v.x, vy + 0.7, v.z);
    carGroup.rotation.y = v.rot;

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 5.0), carMat);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 2.6), matDarkSteel);
    cabin.position.set(0, 0.6, -0.2);

    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 4.8), matVibrantYellow);
    stripeL.position.set(-1.1, 0.42, 0);
    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 4.8), matVibrantYellow);
    stripeR.position.set(1.1, 0.42, 0);

    carGroup.add(body, cabin, stripeL, stripeR);
    markStatic(carGroup);
    mapGroup.add(carGroup);
    addCollider(v.x, vy + 0.7, v.z, 2.6, 1.4, 5.2);
  });

  // 8. BOUNDARY PERIMETER WALLS
  const wallMat = matTravertine;
  const wallH = 28;
  const wallBaseY = -10;
  const wallCenterY = wallBaseY + wallH / 2;
  const wallTopY = wallBaseY + wallH;

  const wallN = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 8, wallH, 4), wallMat);
  wallN.position.set(0, wallCenterY, -halfD - 2);
  const wallNCap = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 8.2, 0.6, 4.2), matVibrantYellow);
  wallNCap.position.set(0, wallTopY + 0.3, -halfD - 2);
  markStatic(wallN);
  markStatic(wallNCap);
  mapGroup.add(wallN, wallNCap);
  addCollider(0, wallCenterY, -halfD - 2, halfW * 2 + 8, wallH, 4);

  const wallS = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 8, wallH, 4), wallMat);
  wallS.position.set(0, wallCenterY, halfD + 2);
  const wallSCap = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 8.2, 0.6, 4.2), matVibrantYellow);
  wallSCap.position.set(0, wallTopY + 0.3, halfD + 2);
  markStatic(wallS);
  markStatic(wallSCap);
  mapGroup.add(wallS, wallSCap);
  addCollider(0, wallCenterY, halfD + 2, halfW * 2 + 8, wallH, 4);

  const wallW = new THREE.Mesh(new THREE.BoxGeometry(4, wallH, halfD * 2 + 8), wallMat);
  wallW.position.set(-halfW - 2, wallCenterY, 0);
  const wallWCap = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, halfD * 2 + 8.2), matVibrantYellow);
  wallWCap.position.set(-halfW - 2, wallTopY + 0.3, 0);
  markStatic(wallW);
  markStatic(wallWCap);
  mapGroup.add(wallW, wallWCap);
  addCollider(-halfW - 2, wallCenterY, 0, 4, wallH, halfD * 2 + 8);

  const wallE = new THREE.Mesh(new THREE.BoxGeometry(4, wallH, halfD * 2 + 8), wallMat);
  wallE.position.set(halfW + 2, wallCenterY, 0);
  const wallECap = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, halfD * 2 + 8.2), matVibrantYellow);
  wallECap.position.set(halfW + 2, wallTopY + 0.3, 0);
  markStatic(wallE);
  markStatic(wallECap);
  mapGroup.add(wallE, wallECap);
  addCollider(halfW + 2, wallCenterY, 0, 4, wallH, halfD * 2 + 8);

  return {
    update: (delta: number, elapsed: number) => {
      if (sunGemMesh) {
        sunGemMesh.rotation.y += delta * 1.5;
        sunGemMesh.rotation.z += delta * 0.8;
      }
      if (ring1) {
        ring1.rotation.y += delta * 0.9;
        ring1.rotation.x += delta * 0.4;
      }
      if (ring2) {
        ring2.rotation.y -= delta * 0.7;
        ring2.rotation.z += delta * 0.5;
      }
    },
    holoGemMesh: sunGemMesh
  };
}
