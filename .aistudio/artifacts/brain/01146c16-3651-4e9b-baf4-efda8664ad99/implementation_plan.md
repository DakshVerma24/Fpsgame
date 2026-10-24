# Neo Tokyo High-Fidelity Mesh Reconstruction Plan

Reconstruct the Neo Tokyo arena by carefully extracting and deep-cloning all authentic architectural and animated meshes from `littlest-neo-tokyo-fast-low.glb`, eliminating corrupted outline hulls and material artifacts, and preserving the intact world hierarchy and animated train physics.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisions confirmed directly through clarifying questions:
> - **Asset Choice**: Retain and carefully reconstruct `littlest-neo-tokyo-fast-low.glb` (The Littlest Tokyo) rather than replacing it with modular city packs or procedural blocks.
> - **Core Issue Identified**: The models appeared inaccurate and distorted because of raw whole-scene parenting, conflicting child node transforms, and the presence of an inverted-hull outline shell (`mesh_11`) obscuring the actual buildings.
> - **Extraction Method**: Perform a clean deep-clone of all physical meshes preserving world hierarchy, shadow casting/receiving, and materials, while cleanly removing distorted hull artifacts.
> - **Lobby Animation Sync**: The map animation toggle remains synchronized across all peers via host broadcasting as previously approved.

- **Confirmed Decision 1 (Deep-Clone Mesh Extraction)**: Rather than taking `gltf.scene` as a monolithic mutable group, traverse and deep-clone the mesh nodes (`Mesh 9` city buildings, `Mesh 28` commercial structures, and `Sketchfab_model` animated train/wire assemblies) into a clean, dedicated map container.
- **Confirmed Decision 2 (Corrupted Outline & Material Filtering)**: Specifically filter out the inverted-hull outline artifact (`mesh_11`) which drew an inaccurate black shroud over the architecture, and sanitize alpha/glass material blending modes (`alpha_glass`, `glass_transp`) so windows and shop interiors render crisply.
- **Confirmed Decision 3 (Preserve Train Animation & Live Colliders)**: Retain the `AnimationMixer` loop (`Take 001`) with live-updating bounding box colliders on `Object680` and `Object681` (the train cars).

---

## 1. Overview & Core Concept

- **What It Does**: Fixes the visual distortion and inaccurate meshes on the Neo Tokyo map by carefully loading and deep-cloning the true 3D meshes from `littlest-neo-tokyo-fast-low.glb`. This restores the authentic Japanese cyberpunk street scene with illuminated storefronts, ramen counters, air conditioning units, telephone poles, and elevated trains.
- **Target Audience / Persona**: Competitive tactical FPS players expecting sharp, clear visual readability, realistic urban cover, and zero graphical glitches during fast-paced gunfights.
- **Key Value**: Delivers the true high-fidelity diorama art style without visual artifacts, floating phantom meshes, or broken materials, while maintaining high framerates and accurate combat hitboxes.

---

## 2. User Experience & Visual Design

- **Visual Identity & Atmosphere**:
  - **Aesthetic**: Authentic retro-futuristic Japanese cyberpunk alleyway with weathered concrete, glowing paper lanterns, neon signboards, and intricate utility wire lattices.
  - **Lighting & Color**: Midnight navy sky (`#070b14`) with balanced cool ambient light (`#1e293b`), subtle cyan and magenta accent fill lights, and warm incandescent glow spilling from storefront windows.
  - **Readability**: High contrast between walkable tarmac/sidewalks and building cover, ensuring player silhouettes remain instantly identifiable across long and short sightlines.
- **Mesh Restoration**:
  - **Building Complexes (Mesh 9)**: Main commercial block, alleyways, storefront counters, vending alcoves, and residential facades render with authentic PBR textures and correct normal mapping.
  - **Ancillary Architecture (Mesh 28)**: Awnings, rooftop vents, and secondary building corners render cleanly without Z-fighting or clipping.
  - **Animated Skyway (`Sketchfab_model`)**: Overhead rail bridge with circulating dual-car train (`Object680`, `Object681`), overhead power lines, and rooftop ventilation fans.
  - **Removal of `mesh_11`**: Stripping the inverted-hull black outline geometry eliminates the distorted black silhouette that previously degraded building fidelity.

---

## 3. Key Technical Decisions & Trade-Offs

- **Decision 1: Deep-Clone vs. Direct Scene Adoption**:
  - *Chosen Approach*: Clone the loaded GLTF hierarchy on instantiate so that map unloads and reloads never mutate or strip children from the cached GLTF resource.
  - *Why*: In Three.js, adding nodes directly from a cached GLTF scene into an active scene graph mutates parent pointers. On subsequent map loads or match restarts, parts of the scene become orphaned or misplaced. Deep-cloning maintains asset purity across sessions.
- **Decision 2: Separation of Outline Shell from Physical Architecture**:
  - *Chosen Approach*: Detect and discard `mesh_11` (the 3ds Max/Blender inverted hull shell), while enabling standard Two-Sided or Front-Side rendering on all physical building materials.
  - *Why*: The original asset had an inverted-hull outline designed for a non-photorealistic cartoon outline shader. In standard Three.js PBR lighting, this hull acts as an opaque, dark exterior barrier that makes buildings look like inaccurate dark blobs. Removing it exposes the true detailed geometry beneath.
- **Decision 3: World Transform Preservation**:
  - *Chosen Approach*: Maintain the native sub-node matrix transforms so child objects under `Sketchfab_model` (e.g. railway tracks, wires, poles) align with the static city blocks (`Mesh 9` and `Mesh 28`).

---

## 4. Technical Architecture & Data Strategy

### System Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GLTF Asset Pipeline                             │
│                  (littlest-neo-tokyo-fast-low.glb)                     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                    Three.js GLTFLoader + Meshopt
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Careful Mesh Extraction                          │
│                                                                        │
│   ├── Child 0: Building Blocks (Mesh 9) ──> Deep Clone & PBR Fixes     │
│   ├── Child 1: Inverted Outline Hull (mesh_11) ──> STRIP / FILTER OUT  │
│   ├── Child 2: Secondary Facades (Mesh 28) ──> Deep Clone & PBR Fixes  │
│   └── Child 3: Animated Assemblies ──> Preserve Tracks & Train Nodes   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Neo Tokyo Scene Graph                            │
│                                                                        │
│   • Map Root (Group)                                                   │
│     ├── True Architectural Meshes (Cast/Receive Shadows)               │
│     ├── Animated Elements (AnimationMixer 'Take 001')                  │
│     ├── Dynamic Train Colliders (Object680 / Object681)                │
│     └── Decomposed Combat Hitboxes (Street, Buildings, Poles)          │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & File Flow

1. **`src/map/glbModelLoader.ts` (`loadNeoTokyoModel`)**:
   - Ensures KTX2 and Meshopt loaders are properly registered.
   - Parses the model and returns a cloned, sanitized model structure.
   - Explicitly filters out `mesh_11` (the outline hull).
   - Calibrates materials: ensures proper `roughness`, `metalness`, and sets `transparent: false` / `depthWrite: true` for opaque surfaces to prevent alpha sort popping.
2. **`src/map/neoTokyoMap.ts` (`buildNeoTokyoMap`)**:
   - Mounts the deep-cloned model into `mapGroup`.
   - Links the animation mixer to the cloned hierarchy for trains and wires.
   - Synchronizes live collision boxes for `trainCar1Obj` and `trainCar2Obj`.
   - Attaches map animation toggle listener (persisted in `localStorage` and synchronized via lobby state).
3. **Verification**:
   - Verify that all building facades, storefront textures, and street signs are crisp and visible.
   - Verify that the moving train aligns smoothly with elevated rails.
   - Run `compile_applet` to confirm zero TypeScript and build errors.
