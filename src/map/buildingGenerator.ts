import * as THREE from 'three';
import { MapContext, BuildingOptions } from './mapTypes';
import { createDetailedBuildingFacade, createIndustrialMetalTexture } from './mapTextures';

// Shared materials and geometries for high performance and low draw calls
const balconyFloorMat = new THREE.MeshStandardMaterial({ color: 0x181e2a, roughness: 0.7, metalness: 0.3 });
const railingMat = new THREE.MeshStandardMaterial({ color: 0x2e3b50, roughness: 0.4, metalness: 0.8 });
const pipeMat = new THREE.MeshStandardMaterial({ color: 0x222a38, roughness: 0.35, metalness: 0.85 });
const acUnitMat = new THREE.MeshStandardMaterial({ color: 0x303848, roughness: 0.6, metalness: 0.4 });
const acGrilleMat = new THREE.MeshBasicMaterial({ color: 0x0f131a });
const storefrontMat = new THREE.MeshStandardMaterial({ color: 0x101520, roughness: 0.2, metalness: 0.6 });

/**
 * Creates an architectural building with varied setbacks, ledges, balconies,
 * external wall pipes, AC units, and ground-level storefronts.
 */
export function createDetailedBuilding(ctx: MapContext, options: BuildingOptions): THREE.Group {
  const { scene, heightAt, addCollider, addFoundation } = ctx;
  const { w, h, d, x, z, baseMaterial, trimColor = 0x00e5ff } = options;

  const baseY = heightAt(x, z);
  const group = new THREE.Group();
  group.position.set(x, baseY, z);

  // Main Building Mass
  const mainGeo = new THREE.BoxGeometry(w, h, d);
  const mainMesh = new THREE.Mesh(mainGeo, baseMaterial);
  mainMesh.position.y = h / 2;
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;
  group.add(mainMesh);

  // Primary collider and foundation skirt
  addCollider(x, baseY + h / 2, z, w, h, d);
  addFoundation(w + 0.3, d + 0.3, x, z, baseY - 16);

  // Decorative Roof Parapet / Ledge Trim (0.5m overhang, 0.6m high)
  const parapetMat = new THREE.MeshStandardMaterial({ color: 0x181e2b, roughness: 0.6, metalness: 0.4 });
  const roofParapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), parapetMat);
  roofParapet.position.y = h + 0.3;
  group.add(roofParapet);

  // Neon glowing trim strip below parapet
  const neonTrim = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.7, 0.2, d + 0.7),
    new THREE.MeshBasicMaterial({ color: trimColor })
  );
  neonTrim.position.y = h + 0.1;
  group.add(neonTrim);

  // Mid-level horizontal architectural cornices/ledges to break vertical monotony
  const numCornices = Math.max(1, Math.floor(h / 9));
  for (let c = 1; c <= numCornices; c++) {
    const ledgeY = (h / (numCornices + 1)) * c;
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4),
      new THREE.MeshStandardMaterial({ color: 0x151b26, roughness: 0.8 })
    );
    cornice.position.y = ledgeY;
    group.add(cornice);
  }

  // Vertical structural corner pillars
  const pillarGeo = new THREE.BoxGeometry(0.8, h + 0.6, 0.8);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a212d, metalness: 0.5, roughness: 0.5 });
  const halfW = w / 2;
  const halfD = d / 2;
  const corners = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [-halfW, halfD],
    [halfW, halfD]
  ];
  corners.forEach(([cx, cz]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(cx, (h + 0.6) / 2, cz);
    pillar.castShadow = true;
    group.add(pillar);
  });

  // Exterior vertical conduit / utility pipes
  if (options.hasConduits !== false) {
    createExteriorPipes(group, w, h, d);
  }

  // Wall-mounted Air Conditioning units
  createWallACUnits(group, w, h, d);

  // Balconies with metal railings on longer side
  if (options.hasBalconies) {
    createBalconies(group, w, h, d);
  }

  // Ground-level storefront / reinforced security portal
  if (options.hasStorefront) {
    createGroundStorefront(group, w, d, trimColor);
  }

  group.updateMatrix();
  group.matrixAutoUpdate = false;
  scene.add(group);
  return group;
}

/**
 * Exterior industrial pipes running along facade edges with support brackets.
 */
function createExteriorPipes(group: THREE.Group, w: number, h: number, d: number): void {
  const pipeH = h - 2;
  const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, pipeH, 8);

  // Pipe A (North-East wall)
  const pipe1 = new THREE.Mesh(pipeGeo, pipeMat);
  pipe1.position.set(w / 2 + 0.15, pipeH / 2 + 1, -d / 4);
  group.add(pipe1);

  // Pipe B (South-West wall)
  const pipe2 = new THREE.Mesh(pipeGeo, pipeMat);
  pipe2.position.set(-w / 2 - 0.15, pipeH / 2 + 1, d / 4);
  group.add(pipe2);

  // Horizontal conduit junctions
  const junctionGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const jMat = new THREE.MeshStandardMaterial({ color: 0x2f3a4d, metalness: 0.8 });
  [3, 8, 14].forEach((yPos) => {
    if (yPos < h - 2) {
      const j1 = new THREE.Mesh(junctionGeo, jMat);
      j1.position.set(w / 2 + 0.18, yPos, -d / 4);
      const j2 = new THREE.Mesh(junctionGeo, jMat);
      j2.position.set(-w / 2 - 0.18, yPos, d / 4);
      group.add(j1, j2);
    }
  });
}

/**
 * 3D AC condenser units mounted on exterior wall brackets with fan grille texture.
 */
function createWallACUnits(group: THREE.Group, w: number, h: number, d: number): void {
  const acW = 1.1;
  const acH = 0.75;
  const acD = 0.65;
  const boxGeo = new THREE.BoxGeometry(acW, acH, acD);
  const fanGeo = new THREE.PlaneGeometry(0.5, 0.5);

  const sides = [
    { side: 'east', x: w / 2 + acD / 2, rotY: Math.PI / 2 },
    { side: 'west', x: -w / 2 - acD / 2, rotY: -Math.PI / 2 }
  ];

  // Distribute 2 to 4 units at believable window levels
  const yLevels = [4.5, 8.5, 13.0];
  sides.forEach(({ x, rotY }) => {
    yLevels.forEach((y, i) => {
      if (y < h - 4 && (i % 2 === 0 || d > 18)) {
        const acUnit = new THREE.Group();
        acUnit.position.set(x, y, (i % 2 === 0 ? 1 : -1) * (d * 0.22));
        acUnit.rotation.y = rotY;

        const body = new THREE.Mesh(boxGeo, acUnitMat);
        body.castShadow = true;
        acUnit.add(body);

        const fan = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.03),
          acGrilleMat
        );
        fan.position.z = acD / 2 + 0.015;
        acUnit.add(fan);

        // Wall support struts
        const strutGeo = new THREE.BoxGeometry(0.06, 0.35, acD);
        const strutMat = new THREE.MeshStandardMaterial({ color: 0x1c222e, metalness: 0.9 });
        const strutL = new THREE.Mesh(strutGeo, strutMat);
        strutL.position.set(-acW * 0.38, -acH * 0.45, 0);
        const strutR = new THREE.Mesh(strutGeo, strutMat);
        strutR.position.set(acW * 0.38, -acH * 0.45, 0);
        acUnit.add(strutL, strutR);

        group.add(acUnit);
      }
    });
  });
}

/**
 * Cantilevered balconies with metal floor plates and safety railings.
 */
function createBalconies(group: THREE.Group, w: number, h: number, d: number): void {
  const bW = 3.8;
  const bH = 0.25;
  const bD = 1.3;

  const floorGeo = new THREE.BoxGeometry(bW, bH, bD);
  const railFrontGeo = new THREE.BoxGeometry(bW, 0.8, 0.05);
  const railSideGeo = new THREE.BoxGeometry(0.05, 0.8, bD);

  const balconyLevels = [5.5, 10.5];
  balconyLevels.forEach((y) => {
    if (y < h - 3) {
      // South-facing balcony
      const bSouth = new THREE.Group();
      bSouth.position.set(0, y, d / 2 + bD / 2);

      const floor = new THREE.Mesh(floorGeo, balconyFloorMat);
      floor.castShadow = true;
      floor.receiveShadow = true;
      bSouth.add(floor);

      const railFront = new THREE.Mesh(railFrontGeo, railingMat);
      railFront.position.set(0, 0.45, bD / 2 - 0.03);
      const railL = new THREE.Mesh(railSideGeo, railingMat);
      railL.position.set(-bW / 2 + 0.03, 0.45, 0);
      const railR = new THREE.Mesh(railSideGeo, railingMat);
      railR.position.set(bW / 2 - 0.03, 0.45, 0);
      bSouth.add(railFront, railL, railR);

      // Support brackets beneath
      const bracketGeo = new THREE.BoxGeometry(0.12, 0.8, bD);
      const b1 = new THREE.Mesh(bracketGeo, railingMat);
      b1.position.set(-bW * 0.35, -0.45, 0);
      const b2 = new THREE.Mesh(bracketGeo, railingMat);
      b2.position.set(bW * 0.35, -0.45, 0);
      bSouth.add(b1, b2);

      group.add(bSouth);
    }
  });
}

/**
 * Ground-level illuminated cyberpunk storefront or secure blast entry portal.
 */
function createGroundStorefront(group: THREE.Group, w: number, d: number, accentColor: number): void {
  const portalW = Math.min(6.5, w * 0.5);
  const portalH = 3.2;
  const portalD = 0.6;

  const portal = new THREE.Group();
  portal.position.set(0, portalH / 2, d / 2 + portalD / 2);

  // Recessed portal frame
  const frameMesh = new THREE.Mesh(
    new THREE.BoxGeometry(portalW, portalH, portalD),
    storefrontMat
  );
  portal.add(frameMesh);

  // Roller security door / illuminated glass with 3D thickness
  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(portalW - 0.6, portalH - 0.6, 0.05),
    new THREE.MeshStandardMaterial({
      color: 0x0c121e,
      roughness: 0.3,
      metalness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
  );
  doorMesh.position.z = portalD / 2 + 0.025;
  portal.add(doorMesh);

  // Entrance awning / canopy with neon underside
  const canopyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(portalW + 0.6, 0.25, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x161d2b, metalness: 0.7 })
  );
  canopyMesh.position.set(0, portalH / 2 + 0.12, 0.7);
  portal.add(canopyMesh);

  // Under-canopy glow strip
  const glowStrip = new THREE.Mesh(
    new THREE.BoxGeometry(portalW + 0.4, 0.06, 1.2),
    new THREE.MeshBasicMaterial({ color: accentColor })
  );
  glowStrip.position.set(0, portalH / 2 - 0.02, 0.7);
  portal.add(glowStrip);

  group.add(portal);
}
