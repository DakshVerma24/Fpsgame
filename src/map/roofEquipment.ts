import * as THREE from 'three';

const hvacMetalMat = new THREE.MeshStandardMaterial({ color: 0x3a4556, metalness: 0.8, roughness: 0.35 });
const darkVentMat = new THREE.MeshBasicMaterial({ color: 0x0c1017 });
const ductMat = new THREE.MeshStandardMaterial({ color: 0x48556b, metalness: 0.75, roughness: 0.4 });
const mastMat = new THREE.MeshStandardMaterial({ color: 0x222a36, metalness: 0.9, roughness: 0.3 });
const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
const satelliteDishMat = new THREE.MeshStandardMaterial({ color: 0x505d73, metalness: 0.7, roughness: 0.35 });

export interface BeaconEntry {
  mesh: THREE.Mesh;
  color: number;
}

export const activeBeacons: BeaconEntry[] = [];

export function clearRoofEquipment(): void {
  activeBeacons.length = 0;
}

/**
 * Adds dense rooftop equipment to a building group.
 * @param group The building THREE.Group
 * @param w Width of building
 * @param h Height of building
 * @param d Depth of building
 * @param themeColor Accent light color
 */
export function addRoofEquipment(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  themeColor = 0x00e5ff
): void {
  const roofY = h + 0.3; // Top of the parapet/roof surface

  // 1. Stairwell Access Penthouse / Roof Exit Doghouse
  const doghouseW = Math.min(3.8, w * 0.35);
  const doghouseH = 2.4;
  const doghouseD = Math.min(3.4, d * 0.35);
  const doghouse = new THREE.Mesh(
    new THREE.BoxGeometry(doghouseW, doghouseH, doghouseD),
    new THREE.MeshStandardMaterial({ color: 0x1a2230, metalness: 0.5, roughness: 0.6 })
  );
  doghouse.position.set(-w * 0.22, roofY + doghouseH / 2, -d * 0.2);
  doghouse.castShadow = true;
  group.add(doghouse);

  // Door on doghouse with realistic frame depth
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x10141d,
    metalness: 0.8,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.9, 0.05),
    doorMat
  );
  door.position.set(-w * 0.22, roofY + 0.95, -d * 0.2 + doghouseD / 2 + 0.025);
  group.add(door);

  // 2. Large Industrial HVAC Chiller Unit
  const hvacW = Math.min(4.2, w * 0.45);
  const hvacH = 1.8;
  const hvacD = Math.min(2.8, d * 0.35);
  const hvac = new THREE.Group();
  hvac.position.set(w * 0.18, roofY, d * 0.15);

  const hvacBody = new THREE.Mesh(new THREE.BoxGeometry(hvacW, hvacH, hvacD), hvacMetalMat);
  hvacBody.position.y = hvacH / 2;
  hvacBody.castShadow = true;
  hvac.add(hvacBody);

  // Top Exhaust Fan Cowlings (2 round cowlings)
  const fanRadius = Math.min(0.75, hvacD * 0.35);
  const fanGeo = new THREE.CylinderGeometry(fanRadius, fanRadius, 0.3, 16);
  const f1 = new THREE.Mesh(fanGeo, darkVentMat);
  f1.position.set(-hvacW * 0.24, hvacH + 0.15, 0);
  const f2 = new THREE.Mesh(fanGeo, darkVentMat);
  f2.position.set(hvacW * 0.24, hvacH + 0.15, 0);
  hvac.add(f1, f2);

  // Side vent louvers with 3D depth to eliminate z-fighting
  const louverMat = new THREE.MeshBasicMaterial({
    color: 0x0c1017,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(hvacW * 0.7, hvacH * 0.6, 0.04), louverMat);
  l1.position.set(0, hvacH / 2, hvacD / 2 + 0.02);
  hvac.add(l1);

  group.add(hvac);

  // 3. Horizontal Ventilation Ductwork
  const ductLength = Math.min(6.5, w * 0.6);
  const ductMesh = new THREE.Mesh(
    new THREE.BoxGeometry(ductLength, 0.7, 0.7),
    ductMat
  );
  ductMesh.position.set(w * 0.05, roofY + 0.35, -d * 0.1);
  ductMesh.castShadow = true;
  group.add(ductMesh);

  // Vertical exhaust stack / flue with cap
  const stackH = 2.2;
  const stack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, stackH, 12),
    ductMat
  );
  stack.position.set(w * 0.05 + ductLength / 2, roofY + stackH / 2, -d * 0.1);
  const stackCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 0.3, 12),
    ductMat
  );
  stackCap.position.set(w * 0.05 + ductLength / 2, roofY + stackH + 0.15, -d * 0.1);
  group.add(stack, stackCap);

  // 4. Communication Antenna Mast with Blinking Warning Beacon
  const mastH = Math.min(10.0, h * 0.45 + 4.0);
  const mast = new THREE.Group();
  mast.position.set(w * 0.35, roofY, -d * 0.3);

  // Base tripod
  const mastBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.3, mastH, 8),
    mastMat
  );
  mastBase.position.y = mastH / 2;
  mast.add(mastBase);

  // Horizontal crossbars
  for (let yb = 2.0; yb < mastH - 1.0; yb += 2.0) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), mastMat);
    bar.position.y = yb;
    mast.add(bar);
  }

  // Top aviation beacon bulb
  const beaconBulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), beaconMat);
  beaconBulb.position.y = mastH + 0.2;
  mast.add(beaconBulb);
  activeBeacons.push({ mesh: beaconBulb, color: 0xff2244 });

  group.add(mast);

  // 5. Parabolic Satellite Uplink Dish (on larger buildings)
  if (w >= 16) {
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-w * 0.3, roofY, d * 0.25);

    // Mount pedestal
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8), mastMat);
    mount.position.y = 0.6;
    dishGroup.add(mount);

    // Parabolic bowl
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2),
      satelliteDishMat
    );
    dish.position.set(0, 1.4, 0);
    dish.rotation.x = -Math.PI / 3;
    dish.rotation.y = Math.PI / 4;
    dishGroup.add(dish);

    // Center feed horn
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), mastMat);
    horn.position.set(0.2, 1.8, 0.2);
    dishGroup.add(horn);

    group.add(dishGroup);
  }

  // 6. Rooftop Power Transformer Cabinet
  const transformer = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.5, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x253140, metalness: 0.8, roughness: 0.4 })
  );
  transformer.position.set(0, roofY + 0.75, d * 0.35);
  group.add(transformer);

  // Warning light on transformer
  const tLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.05),
    new THREE.MeshBasicMaterial({ color: themeColor })
  );
  tLight.position.set(0, roofY + 1.2, d * 0.35 + 0.61);
  group.add(tLight);
}

/**
 * Updates all registered warning beacons (blinking effect)
 */
export function updateBeacons(elapsed: number): void {
  const isBlink = Math.sin(elapsed * 4.0) > 0;
  for (let i = 0; i < activeBeacons.length; i++) {
    const b = activeBeacons[i];
    if (isBlink) {
      b.mesh.visible = true;
    } else {
      b.mesh.visible = false;
    }
  }
}
