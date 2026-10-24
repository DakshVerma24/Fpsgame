import * as THREE from 'three';
import { MapContext } from './mapTypes';

const cableMat = new THREE.MeshBasicMaterial({ color: 0x111620 });
const holoRingMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true });

export interface AnimatedAtmosphere {
  steamParticles: { mesh: THREE.Mesh; initialY: number; speed: number }[];
  rotatingHoloMeshes: THREE.Mesh[];
}

export const atmosphereState: AnimatedAtmosphere = {
  steamParticles: [],
  rotatingHoloMeshes: []
};

export function clearAtmosphere(): void {
  atmosphereState.steamParticles.length = 0;
  atmosphereState.rotatingHoloMeshes.length = 0;
}

/**
 * Creates overhead drooping utility cables connecting building rooftops across roadways.
 */
export function createOverheadCables(ctx: MapContext): void {
  const { scene, heightAt } = ctx;

  const cableSpans: [THREE.Vector3, THREE.Vector3][] = [
    // Between Central Choke Tower and Red base
    [
      new THREE.Vector3(-8, heightAt(0, 0) + 22, -4),
      new THREE.Vector3(-31, heightAt(-40, -18) + 24, -12)
    ],
    // Between Central Choke Tower and Blue base
    [
      new THREE.Vector3(8, heightAt(0, 0) + 22, 4),
      new THREE.Vector3(31, heightAt(40, 18) + 24, 12)
    ],
    // Across North alley (Central to Nexus)
    [
      new THREE.Vector3(-4, heightAt(0, 0) + 20, -9),
      new THREE.Vector3(-6, heightAt(0, -34) + 18, -27)
    ],
    // Across South alley (Central to Transit)
    [
      new THREE.Vector3(4, heightAt(0, 0) + 20, 9),
      new THREE.Vector3(6, heightAt(0, 34) + 18, 27)
    ]
  ];

  cableSpans.forEach(([p1, p2]) => {
    // Generate 2 parallel drooping catenary cables
    [-0.5, 0.5].forEach((offset) => {
      const start = p1.clone().add(new THREE.Vector3(0, offset, 0));
      const end = p2.clone().add(new THREE.Vector3(0, offset, 0));

      // Droop sag point at mid-span
      const mid = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5)
        .add(new THREE.Vector3(0, -3.2, 0));

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(14);
      const cableGeo = new THREE.BufferGeometry().setFromPoints(points);
      const cableLine = new THREE.Line(cableGeo, cableMat);
      cableLine.updateMatrix();
      cableLine.matrixAutoUpdate = false;
      const targetGroup = ctx.clutterGroup || scene;
      targetGroup.add(cableLine);
    });
  });
}

/**
 * Creates subtle rising steam vents from street manholes and industrial cooling stacks.
 */
export function createSteamVents(ctx: MapContext): void {
  const { scene, heightAt, clutterGroup } = ctx;
  const targetGroup = clutterGroup || scene;
  const steamGeo = new THREE.SphereGeometry(0.35, 6, 6);
  const steamMat = new THREE.MeshBasicMaterial({
    color: 0x90a8cc,
    transparent: true,
    opacity: 0.22
  });

  const ventLocations = [
    { x: -15, z: 0 },
    { x: 15, z: 0 },
    { x: 0, z: -14 },
    { x: 0, z: 14 }
  ];

  ventLocations.forEach(({ x, z }) => {
    const baseY = heightAt(x, z) + 0.1;
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(steamGeo, steamMat);
      const yOffset = Math.random() * 2.5;
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.4,
        baseY + yOffset,
        z + (Math.random() - 0.5) * 0.4
      );
      targetGroup.add(mesh);
      atmosphereState.steamParticles.push({
        mesh,
        initialY: baseY,
        speed: 0.6 + Math.random() * 0.4
      });
    }
  });
}

/**
 * Creates futuristic holographic ring projections above plaza centers.
 */
export function createHolographicDisplays(ctx: MapContext): void {
  const { scene, heightAt } = ctx;

  const holoSpots = [
    { x: -18, z: 20, color: 0xff3355 },
    { x: 18, z: -20, color: 0x00e5ff }
  ];

  holoSpots.forEach(({ x, z, color }) => {
    const y = heightAt(x, z) + 3.8;
    const ringGeo = new THREE.TorusGeometry(1.6, 0.08, 8, 16);
    const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, wireframe: true }));
    ringMesh.position.set(x, y, z);
    ringMesh.rotation.x = Math.PI / 2.5;
    scene.add(ringMesh);
    atmosphereState.rotatingHoloMeshes.push(ringMesh);
  });
}

/**
 * Updates steam particle positions and holographic rotations.
 */
export function updateAtmosphere(delta: number, elapsed: number): void {
  // Rising steam puffs
  for (let i = 0; i < atmosphereState.steamParticles.length; i++) {
    const sp = atmosphereState.steamParticles[i];
    sp.mesh.position.y += sp.speed * delta;
    sp.mesh.scale.addScalar(delta * 0.35);

    if (sp.mesh.position.y > sp.initialY + 3.5) {
      sp.mesh.position.y = sp.initialY;
      sp.mesh.scale.set(1, 1, 1);
    }
  }

  // Rotating holographic elements
  for (let i = 0; i < atmosphereState.rotatingHoloMeshes.length; i++) {
    const h = atmosphereState.rotatingHoloMeshes[i];
    h.rotation.z += delta * 0.9;
    h.rotation.y += delta * 0.6;
  }
}
