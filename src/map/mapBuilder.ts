import * as THREE from 'three';
import { MapContext, HeightAtFunction, Collider } from './mapTypes';
import {
  createAsphaltRoadTexture,
  createDetailedBuildingFacade,
  createCyberNeonSignTexture,
  createIndustrialMetalTexture
} from './mapTextures';
import { createDetailedBuilding } from './buildingGenerator';
import { addRoofEquipment, updateBeacons, clearRoofEquipment } from './roofEquipment';
import {
  createSidewalks,
  createStreetDrains,
  createStreetLamps,
  createDumpsters,
  createConcreteBarriers,
  createNeonBollards,
  createParkedTacticalVehicles,
  createStreetBenches
} from './streetProps';
import {
  createOverheadCables,
  createSteamVents,
  createHolographicDisplays,
  updateAtmosphere,
  clearAtmosphere
} from './cyberAtmosphere';

export interface UpgradedMapResult {
  update: (delta: number, elapsed: number) => void;
  holoGemMesh?: THREE.Mesh | null;
  clutterGroup?: THREE.Group;
}

/**
 * Builds the complete, richly detailed urban cyberpunk map while preserving
 * exact gameplay balance, player collision boundaries, and terrain slopes.
 */
export function buildUpgradedCityMap(
  scene: THREE.Scene,
  colliders: Collider[],
  heightAt: HeightAtFunction,
  halfW: number,
  halfD: number
): UpgradedMapResult {
  // Clear persistent atmospheric & beacon cache to prevent duplicate animations on map reload
  clearRoofEquipment();
  clearAtmosphere();

  const clutterGroup = new THREE.Group();
  scene.add(clutterGroup);

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

  function addFoundation(w: number, d: number, x: number, z: number, bottomH = -16) {
    const midY = (heightAt(x, z) + bottomH) / 2;
    const skirtH = Math.abs(heightAt(x, z) - bottomH) + 2;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, skirtH, d),
      new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.9 })
    );
    mesh.position.set(x, midY, z);
    mesh.receiveShadow = true;
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
    addCollider(x, midY, z, w, skirtH, d);
  }

  const ctx: MapContext = {
    scene,
    colliders,
    heightAt,
    halfW,
    halfD,
    addCollider,
    addFoundation,
    clutterGroup
  };

  // 1. High-Detail Ground Terrain with realistic asphalt grain, striping, & puddles
  const terrainGeo = new THREE.PlaneGeometry(halfW * 2 + 6, halfD * 2 + 6, 80, 70);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, heightAt(vx, vz));
  }
  terrainGeo.computeVertexNormals();

  const masterRoadTex = createAsphaltRoadTexture('#00e5ff', '#131722');
  masterRoadTex.repeat.set(16, 14);
  const terrainMesh = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshStandardMaterial({
      map: masterRoadTex,
      roughness: 0.38,
      metalness: 0.45
    })
  );
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // 2. Perimeter Boundary Walls with Neon Trim
  function addPerimeterWall(w: number, h: number, d: number, x: number, y: number, z: number) {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x121622, roughness: 0.85, metalness: 0.2 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    addCollider(x, y, z, w, h, d);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(w > 1 ? w : 0.4, 0.5, d > 1 ? d : 0.4),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    trim.position.set(x, y + h / 2 + 0.25, z);
    scene.add(trim);
  }

  addPerimeterWall(halfW * 2 + 4, 30, 2, 0, 10, -halfD - 1);
  addPerimeterWall(halfW * 2 + 4, 30, 2, 0, 10, halfD + 1);
  addPerimeterWall(2, 30, halfD * 2 + 4, -halfW - 1, 10, 0);
  addPerimeterWall(2, 30, halfD * 2 + 4, halfW + 1, 10, 0);

  // 3. Facade Materials with realistic multi-tone interior lighting
  const matRedBase = new THREE.MeshStandardMaterial({
    map: createDetailedBuildingFacade('#141824', '#ff3355', 0.65),
    roughness: 0.4,
    metalness: 0.55
  });

  const matRedReactor = new THREE.MeshStandardMaterial({
    map: createDetailedBuildingFacade('#121c16', '#ff2bd6', 0.55),
    roughness: 0.45,
    metalness: 0.5
  });

  const matBlueBase = new THREE.MeshStandardMaterial({
    map: createDetailedBuildingFacade('#1e1a12', '#00e5ff', 0.7),
    roughness: 0.38,
    metalness: 0.6
  });

  const matBlueUplink = new THREE.MeshStandardMaterial({
    map: createDetailedBuildingFacade('#1e121e', '#00e5ff', 0.6),
    roughness: 0.4,
    metalness: 0.65
  });

  const matCentralTower = new THREE.MeshStandardMaterial({
    map: createDetailedBuildingFacade('#0e111a', '#00e5ff', 0.75),
    roughness: 0.32,
    metalness: 0.7
  });

  const matNexusResearch = new THREE.MeshStandardMaterial({
    map: createDetailedBuildingFacade('#181b22', '#ffaa00', 0.6),
    roughness: 0.42,
    metalness: 0.5
  });

  const matTransitDepot = new THREE.MeshStandardMaterial({
    map: createDetailedBuildingFacade('#111815', '#00ff88', 0.55),
    roughness: 0.45,
    metalness: 0.45
  });

  // Helper for Neon Billboards
  function addNeonBillboard(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    text: string,
    subtext: string,
    colorHex: string,
    rotY = 0,
    kanji = 'サイバー'
  ) {
    const geo = new THREE.BoxGeometry(w, h, 0.14);
    const backingMat = new THREE.MeshStandardMaterial({ color: 0x0a0e17, roughness: 0.8 });
    const signMat = new THREE.MeshBasicMaterial({
      map: createCyberNeonSignTexture(text, subtext, colorHex, kanji),
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    // Box face order: [right (+X), left (-X), top (+Y), bottom (-Y), front (+Z), back (-Z)]
    const materials = [backingMat, backingMat, backingMat, backingMat, signMat, backingMat];
    const mesh = new THREE.Mesh(geo, materials);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    scene.add(mesh);
  }

  // 4. Buildings (Exact Positions Preserved, Architectural Richness Added)

  // Building 1: Red Base Main (-40, -18)
  const bRedMain = createDetailedBuilding(ctx, {
    w: 18, h: 28, d: 22, x: -40, z: -18,
    baseMaterial: matRedBase,
    trimColor: 0xff3355,
    hasBalconies: true,
    hasStorefront: true
  });
  addRoofEquipment(bRedMain, 18, 28, 22, 0xff3355);
  addNeonBillboard(-30.85, heightAt(-30.85, -18) + 12, -18, 16, 5, 'NIGHT CORP // 07', 'RED SQUAD HIGH COMMAND', '#ff3355', Math.PI / 2, '夜 corporate');

  // Building 2: Red Reactor (-40, 20)
  const bRedReactor = createDetailedBuilding(ctx, {
    w: 16, h: 22, d: 20, x: -40, z: 20,
    baseMaterial: matRedReactor,
    trimColor: 0xff3355,
    hasBalconies: false,
    hasStorefront: true
  });
  addRoofEquipment(bRedReactor, 16, 22, 20, 0xff3355);
  addNeonBillboard(-31.85, heightAt(-31.85, 20) + 10, 20, 14, 4.5, 'REACTOR SUB-01', 'CRITICAL WEAPONS DEPOT', '#ff3355', Math.PI / 2, '反応炉');

  // Building 3: Blue Base Main (40, 18)
  const bBlueMain = createDetailedBuilding(ctx, {
    w: 18, h: 28, d: 22, x: 40, z: 18,
    baseMaterial: matBlueBase,
    trimColor: 0x00e5ff,
    hasBalconies: true,
    hasStorefront: true
  });
  addRoofEquipment(bBlueMain, 18, 28, 22, 0x00e5ff);
  addNeonBillboard(30.85, heightAt(30.85, 18) + 12, 18, 16, 5, 'KENDACHI DATA', 'BLUE SQUAD HIGH COMMAND', '#00e5ff', -Math.PI / 2, '電脳データ');

  // Building 4: Blue Uplink (40, -20)
  const bBlueUplink = createDetailedBuilding(ctx, {
    w: 16, h: 22, d: 20, x: 40, z: -20,
    baseMaterial: matBlueUplink,
    trimColor: 0x00e5ff,
    hasBalconies: false,
    hasStorefront: true
  });
  addRoofEquipment(bBlueUplink, 16, 22, 20, 0x00e5ff);
  addNeonBillboard(31.85, heightAt(31.85, -20) + 10, -20, 14, 4.5, 'ARASAKA UPLINK', 'SECURE TACTICAL COMMS', '#00e5ff', -Math.PI / 2, '通信タワー');

  // Building 5: Center Chokepoint Tower (0, 0)
  const bCenterTower = createDetailedBuilding(ctx, {
    w: 16, h: 26, d: 18, x: 0, z: 0,
    baseMaterial: matCentralTower,
    trimColor: 0xff2bd6,
    hasBalconies: true,
    hasStorefront: true
  });
  addRoofEquipment(bCenterTower, 16, 26, 18, 0xff2bd6);
  // Correct orientation: North face billboard faces North towards players (-Z), South face billboard faces South (+Z)
  addNeonBillboard(0, heightAt(0, -9.1) + 12, -9.1, 14, 4.5, 'SECTOR CENTRAL', 'TACTICAL CHOKEPOINT', '#ff2bd6', Math.PI, '中央セクター');
  addNeonBillboard(0, heightAt(0, 9.1) + 12, 9.1, 14, 4.5, 'CYBER DISTRICT', 'MUNICIPAL ACCESS', '#ff2bd6', 0, '電脳地区');

  // Building 6: North Research Complex (0, -34)
  const bNexus = createDetailedBuilding(ctx, {
    w: 24, h: 20, d: 14, x: 0, z: -34,
    baseMaterial: matNexusResearch,
    trimColor: 0xffdd00,
    hasBalconies: false,
    hasStorefront: true
  });
  addRoofEquipment(bNexus, 24, 20, 14, 0xffdd00);
  addNeonBillboard(0, heightAt(0, -26.9) + 9, -26.9, 18, 4.5, 'NEXUS RESEARCH', 'ADVANCED BIO-TECH DIV', '#ffdd00', 0, '生体工学');

  // Building 7: South Transit Depot (0, 34)
  const bTransit = createDetailedBuilding(ctx, {
    w: 24, h: 20, d: 14, x: 0, z: 34,
    baseMaterial: matTransitDepot,
    trimColor: 0x00ff88,
    hasBalconies: false,
    hasStorefront: true
  });
  addRoofEquipment(bTransit, 24, 20, 14, 0x00ff88);
  addNeonBillboard(0, heightAt(0, 26.9) + 9, 26.9, 18, 4.5, 'TRANSIT DEPOT', 'SUB-LEVEL FREIGHT ACCESS', '#00ff88', Math.PI, '物流基地');

  // 5. Upgraded Water Coolant Towers
  function addUpgradedCoolantTower(x: number, z: number, radius = 3.6, tankH = 5.5, legH = 7.0, accentHex = 0x00e5ff) {
    const baseY = heightAt(x, z);
    const group = new THREE.Group();
    group.position.set(x, baseY, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2b3445, metalness: 0.85, roughness: 0.3 });
    const darkLegMat = new THREE.MeshStandardMaterial({ color: 0x181e2b, metalness: 0.9, roughness: 0.4 });

    const legOffset = radius * 0.75;
    const legGeo = new THREE.CylinderGeometry(0.3, 0.4, legH, 8);
    const legPositions = [
      [-legOffset, -legOffset],
      [legOffset, -legOffset],
      [-legOffset, legOffset],
      [legOffset, legOffset]
    ];

    legPositions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, darkLegMat);
      leg.position.set(lx, legH / 2, lz);
      leg.castShadow = true;
      group.add(leg);
      addCollider(x + lx, baseY + legH / 2, z + lz, 0.8, legH, 0.8);
    });

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, tankH, 20), metalMat);
    tank.position.y = legH + tankH / 2;
    tank.castShadow = true;
    group.add(tank);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), metalMat);
    dome.position.y = legH + tankH;
    group.add(dome);

    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius + 0.14, 0.22, 8, 20),
      new THREE.MeshBasicMaterial({ color: accentHex })
    );
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = legH + tankH * 0.5;
    group.add(glowRing);

    // Industrial inspection ladder
    const ladder = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, legH + tankH, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x1a2230, metalness: 0.9 })
    );
    ladder.position.set(0, (legH + tankH) / 2, radius + 0.1);
    group.add(ladder);

    addCollider(x, baseY + legH + tankH / 2, z, radius * 2, tankH, radius * 2);
    addFoundation(radius * 2, radius * 2, x, z, baseY - 4);
    scene.add(group);
  }

  addUpgradedCoolantTower(-22, -26, 3.4, 5.0, 6.5, 0x00e5ff);
  addUpgradedCoolantTower(22, 26, 3.4, 5.0, 6.5, 0xff2bd6);

  // 6. Upgraded Hologram Plazas
  let holoGemMesh: THREE.Mesh | null = null;
  function addUpgradedHoloPlaza(x: number, z: number, accentColor = 0x00e5ff) {
    const baseY = heightAt(x, z);
    const group = new THREE.Group();
    group.position.set(x, baseY, z);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x171d2b, roughness: 0.5, metalness: 0.5 });
    const step1 = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.5, 0.6, 8), baseMat);
    step1.position.y = 0.3;
    step1.receiveShadow = true;
    group.add(step1);

    const projRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.15, 8, 20),
      new THREE.MeshBasicMaterial({ color: accentColor })
    );
    projRing.rotation.x = Math.PI / 2;
    projRing.position.y = 0.65;
    group.add(projRing);

    const gem = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4, 0),
      new THREE.MeshBasicMaterial({ color: accentColor, wireframe: true })
    );
    gem.position.y = 2.4;
    group.add(gem);
    if (!holoGemMesh) holoGemMesh = gem;

    scene.add(group);
    addCollider(x, baseY + 0.3, z, 7.0, 0.8, 7.0);
    addFoundation(7.5, 7.5, x, z, baseY - 4);
  }

  addUpgradedHoloPlaza(-18, 20, 0xff3355);
  addUpgradedHoloPlaza(18, -20, 0x00e5ff);

  // 7. Tactical Cover Objects (Containers, Barriers, Crates)
  const containerBlueMat = new THREE.MeshStandardMaterial({
    map: createIndustrialMetalTexture('#12263d', '#00e5ff'),
    roughness: 0.45,
    metalness: 0.65
  });

  const containerRedMat = new THREE.MeshStandardMaterial({
    map: createIndustrialMetalTexture('#3d141e', '#ff3355'),
    roughness: 0.45,
    metalness: 0.65
  });

  const woodCoverMat = new THREE.MeshStandardMaterial({
    color: 0x5a4128,
    roughness: 0.75,
    metalness: 0.2
  });

  const concreteCoverMat = new THREE.MeshStandardMaterial({
    color: 0x3d4758,
    roughness: 0.7,
    metalness: 0.3
  });

  function addCoverObject(w: number, h: number, d: number, x: number, z: number, mat: THREE.Material) {
    const y = heightAt(x, z);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    addCollider(x, y + h / 2, z, w, h, d);
    addFoundation(w + 0.1, d + 0.1, x, z, y - 4);
    return mesh;
  }

  // Shipping Containers
  addCoverObject(3.2, 3.0, 7.5, -20, -5, containerRedMat);
  addCoverObject(3.2, 3.0, 7.5, 20, 5, containerBlueMat);
  addCoverObject(7.5, 3.0, 3.2, -18, -14, containerRedMat);
  addCoverObject(7.5, 3.0, 3.2, 18, 14, containerBlueMat);

  // Concrete Barriers
  addCoverObject(5.0, 1.4, 2.0, -10, -10, concreteCoverMat);
  addCoverObject(5.0, 1.4, 2.0, 10, 10, concreteCoverMat);
  addCoverObject(2.0, 1.4, 5.0, -10, 10, concreteCoverMat);
  addCoverObject(2.0, 1.4, 5.0, 10, -10, concreteCoverMat);

  // Supply Crates
  addCoverObject(4.0, 1.5, 2.5, -30, 0, woodCoverMat);
  addCoverObject(4.0, 1.5, 2.5, 30, 0, woodCoverMat);
  addCoverObject(3.0, 1.4, 3.0, 0, -18, woodCoverMat);
  addCoverObject(3.0, 1.4, 3.0, 0, 18, woodCoverMat);
  addCoverObject(2.0, 1.3, 4.0, -28, 26, concreteCoverMat);
  addCoverObject(2.0, 1.3, 4.0, 28, -26, concreteCoverMat);
  addCoverObject(4.0, 1.4, 2.0, -24, -36, woodCoverMat);
  addCoverObject(4.0, 1.4, 2.0, 24, 36, woodCoverMat);

  // 8. New Urban Street Features & Environmental Clutter
  createSidewalks(ctx);
  createStreetDrains(ctx);
  createStreetLamps(ctx);
  createDumpsters(ctx);
  createConcreteBarriers(ctx);
  createNeonBollards(ctx);
  createParkedTacticalVehicles(ctx);
  createStreetBenches(ctx);

  // 9. Atmospheric Effects (Overhead Cables, Steam Vents, Holograms)
  createOverheadCables(ctx);
  createSteamVents(ctx);
  createHolographicDisplays(ctx);

  return {
    holoGemMesh,
    clutterGroup,
    update: (delta: number, elapsed: number) => {
      if (clutterGroup.visible) {
        updateBeacons(elapsed);
        updateAtmosphere(delta, elapsed);
      }
    }
  };
}
