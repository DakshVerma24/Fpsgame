import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Collider } from './mapTypes';

const gltfLoader = new GLTFLoader();
if (MeshoptDecoder) {
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
}
let ktx2Loader: KTX2Loader | null = null;
let savedRenderer: THREE.WebGLRenderer | null = null;

export function initKTX2Support(renderer?: THREE.WebGLRenderer) {
  if (renderer) {
    savedRenderer = renderer;
  }
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('/basis/');
    gltfLoader.setKTX2Loader(ktx2Loader);
  }
  if (savedRenderer && ktx2Loader) {
    try {
      ktx2Loader.detectSupport(savedRenderer);
    } catch (e) {
      console.warn('KTX2 detectSupport warning:', e);
    }
  }
}

// Cached parsed scenes to avoid repeated fetch & parse overhead
let cachedBuildingScene: THREE.Group | null = null;
let buildingLoadPromise: Promise<THREE.Group> | null = null;

let cachedPackScene: THREE.Group | null = null;
let packLoadPromise: Promise<THREE.Group> | null = null;

let cachedNeighbourhoodScene: THREE.Group | null = null;
let neighbourhoodLoadPromise: Promise<THREE.Group> | null = null;

/**
 * Filter out oversized skyboxes, 13,000-unit train lines, and occluded geometry
 * from lowpoly_city_street_pack_buildings_stylized.glb
 */
function cleanStylizedPack(scene: THREE.Group) {
  const toRemove: THREE.Object3D[] = [];

  scene.traverse((obj) => {
    const name = (obj.name || '').toLowerCase();
    // Detect bloated / off-map skybox and train assets
    if (
      name.includes('sphere_background') ||
      name.includes('sphere.001') ||
      name.includes('train') ||
      name.includes('trail') ||
      name.includes('props_interior')
    ) {
      toRemove.push(obj);
      return;
    }

    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Ensure materials work with scene lighting
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => fixMaterial(m));
        } else {
          fixMaterial(mesh.material);
        }
      }
    }
  });

  toRemove.forEach((obj) => {
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  });
}

function fixMaterial(mat: THREE.Material) {
  if ('roughness' in mat && typeof (mat as any).roughness === 'number') {
    (mat as any).roughness = Math.max(0.4, (mat as any).roughness);
  }
}

/**
 * Asynchronously loads and caches the low-poly boutique building.
 */
export function loadBuildingModel(): Promise<THREE.Group> {
  if (cachedBuildingScene) {
    return Promise.resolve(cachedBuildingScene);
  }
  if (buildingLoadPromise) {
    return buildingLoadPromise;
  }

  buildingLoadPromise = new Promise<THREE.Group>((resolve, reject) => {
    gltfLoader.load(
      '/models/low_poly_building.glb',
      (gltf) => {
        const root = gltf.scene;
        root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            if (m.material) {
              if (Array.isArray(m.material)) {
                m.material.forEach(mat => fixMaterial(mat));
              } else {
                fixMaterial(m.material);
              }
            }
          }
        });

        // Compute local bounding box to normalize ground alignment
        const box = new THREE.Box3().setFromObject(root);
        // Center on X and Z, set bottom to Y = 0
        root.position.set(-box.min.x - (box.max.x - box.min.x) / 2, -box.min.y, -box.min.z - (box.max.z - box.min.z) / 2);
        
        const wrapper = new THREE.Group();
        wrapper.name = 'LowPolyBuilding_Template';
        wrapper.add(root);

        cachedBuildingScene = wrapper;
        resolve(wrapper);
      },
      undefined,
      (err) => {
        console.warn('Could not load /models/low_poly_building.glb, using procedural fallback', err);
        reject(err);
      }
    );
  });

  return buildingLoadPromise;
}

/**
 * Asynchronously loads and cleans the stylized street pack.
 */
export function loadStylizedStreetPack(): Promise<THREE.Group> {
  if (cachedPackScene) {
    return Promise.resolve(cachedPackScene);
  }
  if (packLoadPromise) {
    return packLoadPromise;
  }

  packLoadPromise = new Promise<THREE.Group>((resolve, reject) => {
    gltfLoader.load(
      '/models/lowpoly_city_street_pack_buildings_stylized.glb',
      (gltf) => {
        cleanStylizedPack(gltf.scene);
        cachedPackScene = gltf.scene;
        resolve(gltf.scene);
      },
      undefined,
      (err) => {
        console.warn('Could not load /models/lowpoly_city_street_pack_buildings_stylized.glb', err);
        reject(err);
      }
    );
  });

  return packLoadPromise;
}

/**
 * Asynchronously loads and caches the 12MB low-poly neighbourhood city model.
 */
export function loadNeighbourhoodModel(): Promise<THREE.Group> {
  if (cachedNeighbourhoodScene) {
    return Promise.resolve(cachedNeighbourhoodScene);
  }
  if (neighbourhoodLoadPromise) {
    return neighbourhoodLoadPromise;
  }

  neighbourhoodLoadPromise = new Promise<THREE.Group>((resolve, reject) => {
    initKTX2Support();
    gltfLoader.load(
      '/models/neighbourhood-city-modular-lowpoly-fast-low.glb',
      (gltf) => {
        const root = gltf.scene;

        root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;

            if (m.material) {
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              mats.forEach((mat) => {
                if ('roughness' in mat && typeof (mat as any).roughness === 'number') {
                  (mat as any).roughness = Math.max(0.4, (mat as any).roughness);
                }
                if ('metalness' in mat && typeof (mat as any).metalness === 'number') {
                  (mat as any).metalness = Math.min(0.7, (mat as any).metalness);
                }
              });
            }
          }
        });

        // Center on X and Z (offset by -2.69 on X and +1.15 on Z)
        // Set bottom ground plane at y = 0
        root.position.set(-2.69, 0, 1.15);

        const wrapper = new THREE.Group();
        wrapper.name = 'Neighbourhood_Scene_Root';
        wrapper.add(root);

        cachedNeighbourhoodScene = wrapper;
        resolve(wrapper);
      },
      undefined,
      (err) => {
        console.warn('Could not load neighbourhood glb', err);
        reject(err);
      }
    );
  });

  return neighbourhoodLoadPromise;
}

export type NeoTokyoGLTF = {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  scenes: THREE.Group[];
  cameras: THREE.Camera[];
  asset: any;
  userData: any;
};

let cachedNeoTokyoGLTF: NeoTokyoGLTF | null = null;
let neoTokyoLoadPromise: Promise<NeoTokyoGLTF> | null = null;

/**
 * Loads the Littlest Neo Tokyo GLB directly using Three.js GLTFLoader,
 * preserving all original meshes, materials, skeletons, and animation tracks.
 */
export function loadNeoTokyoModel(): Promise<NeoTokyoGLTF> {
  if (cachedNeoTokyoGLTF) {
    return Promise.resolve(cachedNeoTokyoGLTF);
  }
  if (neoTokyoLoadPromise) {
    return neoTokyoLoadPromise;
  }

  initKTX2Support();
  neoTokyoLoadPromise = new Promise<NeoTokyoGLTF>((resolve, reject) => {
    gltfLoader.load(
      '/models/littlest-neo-tokyo-fast-low.glb',
      (gltf) => {
        cachedNeoTokyoGLTF = gltf as unknown as NeoTokyoGLTF;
        resolve(cachedNeoTokyoGLTF);
      },
      undefined,
      (err) => {
        console.warn('Could not load littlest-neo-tokyo-fast-low.glb', err);
        neoTokyoLoadPromise = null;
        reject(err);
      }
    );
  });

  return neoTokyoLoadPromise;
}

/**
 * Carefully deep-clones the Neo Tokyo model preserving the world hierarchy,
 * skeletons, and animation tracks, while stripping out corrupted inverted-hull outline shells
 * (mesh_11 and Object675_outline_0) and calibrating physical PBR materials.
 */
export function instantiateNeoTokyoModel(gltf: NeoTokyoGLTF): {
  model: THREE.Group;
  animations: THREE.AnimationClip[];
} {
  // Deep clone using SkeletonUtils to properly replicate bone hierarchies and animation bindings
  const cloned = SkeletonUtils.clone(gltf.scene) as THREE.Group;

  // Filter out inverted cartoon outline meshes that act as black shadow occluders covering buildings
  const toRemove: THREE.Object3D[] = [];
  cloned.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material;
      const matName = Array.isArray(mat) ? mat.map((m) => m.name).join(' ') : (mat?.name || '');
      const name = (mesh.name || '').toLowerCase();

      if (
        name.includes('outline') ||
        name === 'mesh_11' ||
        matName.includes('outline')
      ) {
        toRemove.push(mesh);
        return;
      }

      // Configure shadows and calibrated PBR material properties on physical meshes
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const mats = Array.isArray(mat) ? mat : [mat];
      mats.forEach((m) => {
        if (!m) return;
        const mName = (m.name || '').toLowerCase();

        if (mName.includes('alpha_glass') || mName.includes('glass_transp')) {
          // Transparent window and door glass
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          m.transparent = true;
          m.opacity = 0.55;
          m.depthWrite = false;
          m.side = THREE.DoubleSide;
        } else if (mName.includes('alpha')) {
          // Foliage, signs, paper lanterns with alpha cutout
          m.transparent = true;
          m.alphaTest = 0.5;
          m.depthWrite = true;
          m.side = THREE.DoubleSide;
        } else {
          // Solid building walls, concrete, metal rail, and plastics
          m.transparent = false;
          m.depthWrite = true;
          if ('roughness' in m && typeof (m as any).roughness === 'number') {
            (m as any).roughness = Math.max(0.35, (m as any).roughness);
          }
          if ('metalness' in m && typeof (m as any).metalness === 'number') {
            (m as any).metalness = Math.min(0.65, (m as any).metalness);
          }
          m.side = THREE.DoubleSide;
        }
      });
    }
  });

  toRemove.forEach((mesh) => {
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
  });

  // Scale and position model so street pavement is at Y = 0 and center is at (0, 0)
  const scale = 0.115;
  cloned.scale.set(scale, scale, scale);
  cloned.position.set(71.6 * scale, 198.5 * scale, 25.6 * scale);
  cloned.updateMatrixWorld(true);

  return {
    model: cloned,
    animations: gltf.animations || []
  };
}

/**
 * Extracts accurate 3D physics colliders directly from the live scaled neighbourhood model
 * covering all physical buildings, apartment blocks, shop rows, and cover
 * while strictly filtering out wires, light glows, and giant merged scene composites.
 * Guarantees zero invisible walls on streets, avenues, and sidewalks.
 */
export function generateNeighbourhoodColliders(rootObj: THREE.Object3D, colliders: Collider[]) {
  // Ensure all live world transformation matrices are fully up to date
  rootObj.updateMatrixWorld(true);

  // 1. Decomposed building sections from composite multi-building meshes:
  // East commercial strip (mesh_36 / mesh_36_1) decomposed into distinct real buildings
  // so the 22-meter central avenue and Eastern Boulevard (Blue Spawn) remain 100% open with ZERO invisible walls:
  colliders.push({ minX: 18.2, maxX: 22.8, minZ: -27.2, maxZ: -23.0, top: 5.5, bottom: -1.0 });
  colliders.push({ minX: 18.8, maxX: 22.8, minZ: -20.2, maxZ: -15.0, top: 6.0, bottom: -1.0 });
  colliders.push({ minX: 15.0, maxX: 24.0, minZ: 7.0, maxZ: 16.8, top: 10.5, bottom: -1.0 });

  // Middle-West multi-story apartment block & shops (mesh_45_1, mesh_45_5, mesh_45)
  // Fully solidifying the middle complex so no player can phase through walls or enter inside:
  colliders.push({ minX: -20.0, maxX: -5.0, minZ: -8.0, maxZ: 15.0, top: 18.5, bottom: -1.0 });

  // North residential complex (mesh_45_1 & mesh_45_4)
  colliders.push({ minX: -20.0, maxX: 5.5, minZ: -34.5, maxZ: -16.0, top: 18.5, bottom: -1.0 });

  // Full-scene merged composites that span across whole city (50m+), creating ghost bounds
  const sceneWideComposites = new Set([
    'mesh_20',     // Ground tarmac slab
    'mesh_36',     // Merged commercial strip (decomposed into real buildings above)
    'mesh_36_1',   // Merged commercial strip (decomposed into real buildings above)
    'mesh_45',     // Merged scene mesh 1
    'mesh_45_1',   // Merged scene mesh 2
    'mesh_45_2',   // Merged scene mesh 3
    'mesh_45_3',   // Merged scene mesh 4
    'mesh_45_4',   // North complex (registered above)
    'mesh_45_5',   // Merged scene mesh 5
    'mesh_45_6',   // Merged scene mesh 6
    'mesh_45_7',   // Merged scene mesh 7
    'mesh_45_8',   // Overhead skybridge / sign (open street underneath)
    'mesh_55',     // Merged backdrop (registered above)
    'mesh_55_1',
    'mesh_55_2',
    'mesh_4',      // Street light fixtures
    'mesh_4_1',    // Overhead wire strip
    'mesh_4_2'     // Roadside divider strip
  ]);

  const isLightOrWire = (obj: THREE.Object3D, mat: any): boolean => {
    const objName = (obj.name || '').toLowerCase();
    if (
      objName.includes('light') ||
      objName.includes('halo') ||
      objName.includes('glow') ||
      objName.includes('wire') ||
      objName.includes('cable') ||
      objName.includes('sky') ||
      objName.includes('background')
    ) {
      return true;
    }
    if (!mat) return false;
    const mats = Array.isArray(mat) ? mat : [mat];
    return mats.some((m) => {
      const mn = (m.name || '').toLowerCase();
      return (
        mn.includes('light') ||
        mn.includes('halo') ||
        mn.includes('glow') ||
        mn.includes('wire')
      );
    });
  };

  const tempMatrix = new THREE.Matrix4();

  const isTreeLeaves = (name: string): boolean => {
    const n = (name || '').toLowerCase();
    return (
      n === 'mesh_48' ||
      n === 'mesh_50' ||
      n === 'mesh_52' ||
      n === 'mesh_54' ||
      n.includes('leaf') ||
      n.includes('leaves') ||
      n.includes('foliage') ||
      n.includes('canopy') ||
      n.includes('crown')
    );
  };

  const isTreeTrunk = (name: string): boolean => {
    const n = (name || '').toLowerCase();
    return (
      n === 'mesh_47' ||
      n === 'mesh_49' ||
      n === 'mesh_51' ||
      n === 'mesh_53' ||
      n.includes('trunk') ||
      n.includes('stem') ||
      (n.includes('tree') && !n.includes('street'))
    );
  };

  // 2. Extract accurate world bounding boxes directly from the live, scaled Three.js scene hierarchy
  rootObj.traverse((obj) => {
    if (sceneWideComposites.has(obj.name)) return;
    if (isLightOrWire(obj, (obj as any).material)) return;

    // Tree foliage / leaves are 100% walk-through; never add a collider for leaves
    if (isTreeLeaves(obj.name)) return;

    if ((obj as THREE.InstancedMesh).isInstancedMesh) {
      const instMesh = obj as THREE.InstancedMesh;
      if (!instMesh.geometry) return;

      if (!instMesh.geometry.boundingBox) instMesh.geometry.computeBoundingBox();
      const geomBox = instMesh.geometry.boundingBox;
      if (!geomBox) return;

      // Check if this is a tree stem / trunk instanced mesh
      if (isTreeTrunk(obj.name)) {
        for (let i = 0; i < instMesh.count; i++) {
          instMesh.getMatrixAt(i, tempMatrix);
          const instWorldMat = new THREE.Matrix4().multiplyMatrices(instMesh.matrixWorld, tempMatrix);
          const instBox = geomBox.clone().applyMatrix4(instWorldMat);
          const cx = (instBox.min.x + instBox.max.x) / 2;
          const cz = (instBox.min.z + instBox.max.z) / 2;
          const stemRadius = 0.22; // 0.18m - 0.24m radius cylinder covering ONLY the tree stem
          colliders.push({
            minX: cx - stemRadius,
            maxX: cx + stemRadius,
            minZ: cz - stemRadius,
            maxZ: cz + stemRadius,
            top: 2.4, // covers only the tree stem, below leaves
            bottom: -1.0,
            isCylinder: true,
            centerX: cx,
            centerZ: cz,
            radius: stemRadius
          });
        }
        return;
      }

      for (let i = 0; i < instMesh.count; i++) {
        instMesh.getMatrixAt(i, tempMatrix);
        const instWorldMat = new THREE.Matrix4().multiplyMatrices(instMesh.matrixWorld, tempMatrix);
        const instBox = geomBox.clone().applyMatrix4(instWorldMat);

        const w = instBox.max.x - instBox.min.x;
        const h = instBox.max.y - instBox.min.y;
        const d = instBox.max.z - instBox.min.z;

        // Solid buildings (apartment blocks mesh_13..18 ~22m wide, shops mesh_33/34, mesh_41, mesh_56):
        if (h >= 1.0 && w >= 0.6 && d >= 0.6 && !(w > 30 && d > 30)) {
          colliders.push({
            minX: instBox.min.x,
            maxX: instBox.max.x,
            minZ: instBox.min.z,
            maxZ: instBox.max.z,
            top: instBox.max.y,
            bottom: -1.0 // Ground-anchored so no player can slip underneath
          });
        }
      }
    } else if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (!mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const geomBox = mesh.geometry.boundingBox;
      if (!geomBox) return;

      // Check if this is a single tree stem / trunk mesh
      if (isTreeTrunk(obj.name)) {
        const worldBox = geomBox.clone().applyMatrix4(mesh.matrixWorld);
        const cx = (worldBox.min.x + worldBox.max.x) / 2;
        const cz = (worldBox.min.z + worldBox.max.z) / 2;
        const stemRadius = 0.22; // 0.18m - 0.24m radius cylinder
        colliders.push({
          minX: cx - stemRadius,
          maxX: cx + stemRadius,
          minZ: cz - stemRadius,
          maxZ: cz + stemRadius,
          top: 2.4, // covers only the tree stem
          bottom: -1.0,
          isCylinder: true,
          centerX: cx,
          centerZ: cz,
          radius: stemRadius
        });
        return;
      }

      const worldBox = geomBox.clone().applyMatrix4(mesh.matrixWorld);
      const w = worldBox.max.x - worldBox.min.x;
      const h = worldBox.max.y - worldBox.min.y;
      const d = worldBox.max.z - worldBox.min.z;

      // Solid standalone buildings and props (mesh_0 store, traffic barriers, crates)
      if (h >= 1.0 && w >= 0.6 && d >= 0.6 && !(w > 30 && d > 30)) {
        colliders.push({
          minX: worldBox.min.x,
          maxX: worldBox.max.x,
          minZ: worldBox.min.z,
          maxZ: worldBox.max.z,
          top: worldBox.max.y,
          bottom: -1.0 // Ground-anchored so no player can slip underneath
        });
      }
    }
  });
}

/**
 * Helper to clone and add a building instance to the scene with accurate collider.
 */
export function instantiateBuilding(
  template: THREE.Group,
  options: {
    x: number;
    y: number;
    z: number;
    rotationY?: number;
    scale?: number | [number, number, number];
    colliders: Collider[];
    parentGroup: THREE.Group;
  }
): THREE.Group {
  const { x, y, z, rotationY = 0, scale = 1, colliders, parentGroup } = options;
  const clone = template.clone(true);

  clone.position.set(x, y, z);
  clone.rotation.y = rotationY;

  const [sx, sy, sz] = Array.isArray(scale) ? scale : [scale, scale, scale];
  clone.scale.set(sx, sy, sz);

  // Compute tight world bounding box for Deadshot player collision
  clone.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(clone);

  const w = bbox.max.x - bbox.min.x;
  const h = bbox.max.y - bbox.min.y;
  const d = bbox.max.z - bbox.min.z;
  const centerX = (bbox.min.x + bbox.max.x) / 2;
  const centerY = (bbox.min.y + bbox.max.y) / 2;
  const centerZ = (bbox.min.z + bbox.max.z) / 2;

  colliders.push({
    minX: centerX - w / 2,
    maxX: centerX + w / 2,
    minZ: centerZ - d / 2,
    maxZ: centerZ + d / 2,
    top: centerY + h / 2,
    bottom: centerY - h / 2
  });

  // Freeze matrix transformations for optimal FPS
  clone.matrixAutoUpdate = false;
  clone.updateMatrix();

  parentGroup.add(clone);
  return clone;
}

/**
 * Helper to register a rectangular collider
 */
export function registerBoxCollider(
  colliders: Collider[],
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number
) {
  colliders.push({
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    top: y + h / 2,
    bottom: y - h / 2
  });
}

/**
 * Adds diagonal capsule-stepped wall collider along a segment (x1, z1) -> (x2, z2).
 * Stepped cylindrical sub-volumes allow seamless corner sliding without snagging on sharp angles.
 */
export function addDiagonalWallCollider(
  colliders: Collider[],
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  thickness: number,
  top: number,
  bottom = -1.0,
  steps = 8
) {
  const r = thickness / 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x1 + (x2 - x1) * t;
    const cz = z1 + (z2 - z1) * t;
    colliders.push({
      minX: cx - r,
      maxX: cx + r,
      minZ: cz - r,
      maxZ: cz + r,
      top,
      bottom,
      isCylinder: true,
      centerX: cx,
      centerZ: cz,
      radius: r
    });
  }
}

/**
 * Extracts and sets up detailed 3D physics colliders for Neo Tokyo (littlest-neo-tokyo-fast-low.glb):
 * - Stepped diagonal colliders for angled building facades and storefront recesses
 * - Solid building core volumes so players cannot clip through walls into building interiors
 * - Cylindrical colliders (r = 0.20m) for utility poles, street lamps, and lantern posts
 * - Outer boundary perimeter colliders
 */
export function generateNeoTokyoColliders(rootObj: THREE.Object3D, colliders: Collider[]) {
  rootObj.updateMatrixWorld(true);

  // 1. Perimeter Arena Boundaries (64m x 64m battlefield)
  colliders.push({ minX: -34.0, maxX: 34.0, minZ: -33.5, maxZ: -31.5, top: 18.0, bottom: -1.0 }); // North
  colliders.push({ minX: -34.0, maxX: 34.0, minZ: 31.5, maxZ: 33.5, top: 18.0, bottom: -1.0 });  // South
  colliders.push({ minX: -34.0, maxX: -32.0, minZ: -33.5, maxZ: 33.5, top: 18.0, bottom: -1.0 }); // West
  colliders.push({ minX: 32.0, maxX: 34.0, minZ: -33.5, maxZ: 33.5, top: 18.0, bottom: -1.0 });  // East

  // 2. West Complex (mesh_9_3 & mesh_9_4 - Storefront row with diagonal corner facing main crossroad)
  // Diagonal facade from (-14.5, -12.0) to (-2.0, 2.0)
  addDiagonalWallCollider(colliders, -14.5, -12.0, -2.0, 2.0, 1.2, 12.0, -1.0, 8);
  // Diagonal continuation from (-2.0, 2.0) to (0.5, 16.5)
  addDiagonalWallCollider(colliders, -2.0, 2.0, 0.5, 16.5, 1.2, 12.0, -1.0, 8);
  // Solid core block behind West storefronts
  colliders.push({ minX: -22.0, maxX: -6.0, minZ: -12.0, maxZ: 17.0, top: 18.0, bottom: -1.0 });

  // 3. East Complex (mesh_9_5 & Object_7 - Skyscraper & elevated station block)
  // Diagonal facade from (2.5, -10.0) to (12.0, 3.0)
  addDiagonalWallCollider(colliders, 2.5, -10.0, 12.0, 3.0, 1.4, 16.0, -1.0, 8);
  // Diagonal facade from (12.0, 3.0) to (16.5, 18.0)
  addDiagonalWallCollider(colliders, 12.0, 3.0, 16.5, 18.0, 1.4, 16.0, -1.0, 8);
  // Solid core block behind East skyscrapers
  colliders.push({ minX: 6.0, maxX: 26.0, minZ: -10.0, maxZ: 22.0, top: 28.0, bottom: -1.0 });

  // 4. Northwest Residential / Back-Alley Block (mesh_28_1)
  addDiagonalWallCollider(colliders, -22.0, 0.0, -12.0, 22.0, 1.2, 10.0, -1.0, 8);
  colliders.push({ minX: -24.0, maxX: -11.0, minZ: 0.0, maxZ: 26.0, top: 14.0, bottom: -1.0 });

  // 5. Far North Block & Elevated Archway
  colliders.push({ minX: -26.0, maxX: 10.0, minZ: 20.0, maxZ: 32.0, top: 22.0, bottom: -1.0 });

  // 6. South Station Terminal & Track Enclosure
  colliders.push({ minX: 6.0, maxX: 30.0, minZ: -32.0, maxZ: -20.0, top: 12.0, bottom: -1.0 });
  // Southwest Kiosk / Transformer Room (Object689)
  colliders.push({ minX: -21.9, maxX: -18.0, minZ: -28.7, maxZ: -24.9, top: 5.0, bottom: -1.0 });
  // South Center Electrical Substation (Object704)
  colliders.push({ minX: -8.8, maxX: -5.8, minZ: -12.8, maxZ: -9.8, top: 3.5, bottom: -1.0 });

  // 7. Utility Poles and Streetlight Masts (slender cylindrical colliders, 0.20m radius)
  const polePositions = [
    { x: 11.3, z: 24.2 },  // Object707 pole
    { x: 18.0, z: -8.0 },  // Station east light post
    { x: -15.0, z: 18.0 }, // West alley post
    { x: -18.5, z: -12.0 },// Southwest street lamp
    { x: 2.0, z: -18.0 },  // South crossroad pole
    { x: 14.0, z: 8.0 },   // East plaza lamp
    { x: -6.0, z: 9.0 }    // Northwest wire anchor post
  ];

  polePositions.forEach(p => {
    colliders.push({
      minX: p.x - 0.20,
      maxX: p.x + 0.20,
      minZ: p.z - 0.20,
      maxZ: p.z + 0.20,
      top: 6.5,
      bottom: -1.0,
      isCylinder: true,
      centerX: p.x,
      centerZ: p.z,
      radius: 0.20
    });
  });
}

