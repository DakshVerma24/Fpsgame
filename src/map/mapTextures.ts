import * as THREE from 'three';

// Cache generated textures so we never recreate identical canvases
const textureCache = new Map<string, THREE.CanvasTexture>();

function getOrCreate(key: string, generator: () => THREE.CanvasTexture): THREE.CanvasTexture {
  if (textureCache.has(key)) return textureCache.get(key)!;
  const tex = generator();
  textureCache.set(key, tex);
  return tex;
}

/**
 * Realistic asphalt road texture with asphalt grain, lane dashes, edge solid lines,
 * crosswalk zebra stripes, and cyber pedestrian arrows.
 */
export function createAsphaltRoadTexture(accentColor = '#00e5ff', asphaltColor = '#12151e'): THREE.CanvasTexture {
  return getOrCreate(`asphalt_${accentColor}_${asphaltColor}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base asphalt
    ctx.fillStyle = asphaltColor;
    ctx.fillRect(0, 0, 512, 512);

    // Fine asphalt gravel noise
    ctx.fillStyle = '#1b202d';
    for (let i = 0; i < 600; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const rSize = Math.random() * 2 + 1;
      ctx.fillRect(rx, ry, rSize, rSize);
    }

    // Asphalt seams / expansion joints
    ctx.strokeStyle = '#0d1017';
    ctx.lineWidth = 2;
    for (let x = 64; x < 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 64; y < 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Road edge solid lane markings
    ctx.fillStyle = '#263348';
    ctx.fillRect(0, 0, 16, 512);
    ctx.fillRect(512 - 16, 0, 16, 512);

    ctx.fillStyle = accentColor;
    ctx.fillRect(16, 0, 6, 512);
    ctx.fillRect(512 - 22, 0, 6, 512);

    // Center divider dash lines
    ctx.fillStyle = '#ffaa00';
    for (let y = 15; y < 512; y += 75) {
      ctx.fillRect(252, y, 8, 42);
    }

    // Subtle tire wear marks
    ctx.fillStyle = 'rgba(10, 12, 18, 0.45)';
    ctx.fillRect(120, 0, 50, 512);
    ctx.fillRect(342, 0, 50, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}

/**
 * Concrete sidewalk paving stones with square tile seams, tactile curb strips, and grime.
 */
export function createSidewalkTexture(baseColor = '#242a38'): THREE.CanvasTexture {
  return getOrCreate(`sidewalk_${baseColor}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Paver tiles
    const tileSize = 64;
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        const shade = Math.floor(Math.random() * 12) - 6;
        ctx.fillStyle = shade >= 0 ? `rgba(255,255,255,${shade * 0.015})` : `rgba(0,0,0,${-shade * 0.02})`;
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        ctx.strokeStyle = '#121620';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, tileSize, tileSize);
      }
    }

    // Tactile warning strip along edge
    ctx.fillStyle = '#ffaa00';
    for (let x = 8; x < 512; x += 16) {
      ctx.beginPath();
      ctx.arc(x, 24, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}

/**
 * High-detail building facade with realistic window frame mullions, diverse interior room
 * lighting states (warm amber, cool cyan, magenta, dimly lit blinds, dark rooms),
 * and structural spandrels.
 */
export function createDetailedBuildingFacade(
  baseColorHex: string,
  primaryGlowHex: string,
  density = 0.65
): THREE.CanvasTexture {
  return getOrCreate(`facade_${baseColorHex}_${primaryGlowHex}_${density}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Concrete/composite wall base
    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 512, 512);

    // Horizontal floor spandrels & vertical structural columns
    ctx.strokeStyle = '#080a12';
    ctx.lineWidth = 4;
    const floorH = 64;
    const bayW = 48;

    for (let y = 0; y <= 512; y += floorH) {
      // Horizontal concrete band
      ctx.fillStyle = '#101420';
      ctx.fillRect(0, y - 6, 512, 12);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    for (let x = 0; x <= 512; x += bayW) {
      // Vertical concrete pillar
      ctx.fillStyle = '#121624';
      ctx.fillRect(x - 3, 0, 6, 512);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    // Window grid
    const winW = 32;
    const winH = 36;
    for (let y = 14; y < 512; y += floorH) {
      for (let x = 8; x < 512; x += bayW) {
        // Window outer frame
        ctx.fillStyle = '#0a0d15';
        ctx.fillRect(x - 2, y - 2, winW + 4, winH + 4);
        ctx.strokeStyle = '#1e2638';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - 2, winW + 4, winH + 4);

        // Window glass state
        const roll = Math.random();
        if (roll < density) {
          let lightColor = primaryGlowHex;
          if (roll < density * 0.35) lightColor = primaryGlowHex;
          else if (roll < density * 0.65) lightColor = '#ffb347'; // Warm office light
          else if (roll < density * 0.85) lightColor = '#00e5ff'; // Cyber cyan
          else lightColor = '#ff2bd6'; // Cyber magenta

          ctx.fillStyle = lightColor;
          ctx.fillRect(x, y, winW, winH);

          // Horizontal blinds / mullions
          ctx.fillStyle = 'rgba(10, 15, 25, 0.4)';
          for (let b = y + 6; b < y + winH; b += 8) {
            ctx.fillRect(x, b, winW, 2);
          }
        } else {
          // Unlit dark window with subtle reflection gradient
          const grad = ctx.createLinearGradient(x, y, x + winW, y + winH);
          grad.addColorStop(0, '#0a0d16');
          grad.addColorStop(1, '#141c2c');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, winW, winH);
        }

        // Center window divider frame
        ctx.fillStyle = '#080a10';
        ctx.fillRect(x + winW / 2 - 1, y, 2, winH);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}

/**
 * Metal panel texture with rivet patterns, expansion grooves, and industrial wear.
 */
export function createIndustrialMetalTexture(color = '#252d3d', accent = '#00e5ff'): THREE.CanvasTexture {
  return getOrCreate(`metal_${color}_${accent}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);

    // Large metal plate seams
    ctx.strokeStyle = '#10141f';
    ctx.lineWidth = 4;
    for (let x = 0; x <= 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Rivets along plate perimeters
    ctx.fillStyle = '#404c63';
    for (let x = 16; x < 512; x += 32) {
      for (let y = 16; y < 512; y += 128) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Cyber warning stencil
    ctx.fillStyle = accent;
    ctx.fillRect(32, 48, 64, 4);
    ctx.fillStyle = '#10141f';
    ctx.font = 'bold 12px Courier New';
    ctx.fillText('SECTOR SPEC // 77', 32, 68);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}

/**
 * Manhole cover texture with concentric grip studs and circular stenciling.
 */
export function createManholeTexture(): THREE.CanvasTexture {
  return getOrCreate('manhole_tex', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 256);

    // Outer rim
    ctx.fillStyle = '#1a202c';
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0e121a';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Inner patterned plate
    ctx.fillStyle = '#262f40';
    ctx.beginPath();
    ctx.arc(128, 128, 110, 0, Math.PI * 2);
    ctx.fill();

    // Grip waffle grid
    ctx.strokeStyle = '#181e2b';
    ctx.lineWidth = 3;
    for (let i = 40; i < 220; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 40);
      ctx.lineTo(i, 216);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(40, i);
      ctx.lineTo(216, i);
      ctx.stroke();
    }

    // Center logo
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('CYBER // MUNICIPAL', 128, 134);

    return new THREE.CanvasTexture(canvas);
  });
}

/**
 * Storm sewer drain grate texture.
 */
export function createStormDrainTexture(): THREE.CanvasTexture {
  return getOrCreate('storm_drain_tex', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Cast iron frame
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#0d1017';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 120);

    // Slotted grate openings (dark hollow voids)
    ctx.fillStyle = '#05070a';
    for (let x = 24; x < 240; x += 18) {
      ctx.fillRect(x, 18, 10, 92);
    }

    return new THREE.CanvasTexture(canvas);
  });
}

/**
 * Industrial dumpster texture with corrosion, spray tags, and hazard markings.
 */
export function createDumpsterTexture(bodyColor = '#1b3226', tagText = 'NIGHTCORP'): THREE.CanvasTexture {
  return getOrCreate(`dumpster_${bodyColor}_${tagText}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bodyColor;
    ctx.fillRect(0, 0, 512, 256);

    // Ribbed reinforcement panels
    ctx.fillStyle = '#0d1813';
    for (let x = 32; x < 512; x += 64) {
      ctx.fillRect(x, 20, 8, 216);
    }

    // Hazard stripe along top edge
    for (let x = 0; x < 512; x += 30) {
      ctx.fillStyle = x % 60 === 0 ? '#ffaa00' : '#111318';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 20, 0);
      ctx.lineTo(x + 10, 20);
      ctx.lineTo(x - 10, 20);
      ctx.fill();
    }

    // Stencil tag / graffiti
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 36px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(tagText, 256, 145);
    ctx.fillStyle = '#aaccff';
    ctx.font = '14px Courier New';
    ctx.fillText('WASTE MANAGEMENT // CLASSIFIED', 256, 175);

    return new THREE.CanvasTexture(canvas);
  });
}

/**
 * Cyberpunk neon signboard texture with illuminated frame and kanji/English.
 */
export function createCyberNeonSignTexture(
  mainText: string,
  subText: string,
  accentColorHex: string,
  kanji = 'サイバー'
): THREE.CanvasTexture {
  return getOrCreate(`neon_sign_${mainText}_${accentColorHex}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Dark acrylic backing
    ctx.fillStyle = '#07090f';
    ctx.fillRect(0, 0, 512, 256);

    // Outer neon glow border
    ctx.strokeStyle = accentColorHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, 488, 232);

    // Inner subtle border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, 468, 212);

    // Kanji top
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(kanji, 256, 68);

    // Main text
    ctx.fillStyle = accentColorHex;
    ctx.font = 'bold 44px Courier New';
    ctx.fillText(mainText, 256, 128);

    // Subtext
    ctx.fillStyle = '#b0c4de';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText(subText, 256, 178);

    // Status beacon dots
    ctx.fillStyle = accentColorHex;
    ctx.beginPath();
    ctx.arc(60, 195, 6, 0, Math.PI * 2);
    ctx.arc(452, 195, 6, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  });
}

/**
 * Mediterranean sun-baked sandstone & travertine paving texture
 * with polygonal slab joints, sun-bleached mortar, and bronze expansion strips.
 */
export function createSolarSandstonePavingTexture(): THREE.CanvasTexture {
  return getOrCreate('solar_sandstone_paving', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base warm golden sand
    ctx.fillStyle = '#cf9f53';
    ctx.fillRect(0, 0, 512, 512);

    // Fine stone grain / sand speckles
    for (let i = 0; i < 900; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const shade = Math.random() > 0.5 ? 'rgba(255,235,185,0.22)' : 'rgba(120,80,30,0.18)';
      ctx.fillStyle = shade;
      ctx.fillRect(rx, ry, Math.random() * 2 + 1, Math.random() * 2 + 1);
    }

    // Large flagstone block joints
    const step = 64;
    for (let y = 0; y < 512; y += step) {
      const offset = (y / step) % 2 === 0 ? 0 : step / 2;
      for (let x = -offset; x < 512 + step; x += step) {
        // Individual stone tone variation
        const toneVar = (Math.random() - 0.5) * 0.14;
        ctx.fillStyle = toneVar > 0 ? `rgba(255,240,200,${toneVar})` : `rgba(70,45,15,${-toneVar})`;
        ctx.fillRect(x + 2, y + 2, step - 4, step - 4);

        // Mortar lines
        ctx.strokeStyle = '#8c6530';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, step, step);
      }
    }

    // Polished brass solar conduit inlay strips
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    for (let x = 128; x <= 384; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}

/**
 * Solar Citadel building facade with warm limestone/terracotta walls,
 * arched louvered windows, bronze mullions, and high-efficiency solar collector glass.
 */
export function createSolarBuildingFacadeTexture(baseColorHex: string, accentGlowHex = '#ffd700'): THREE.CanvasTexture {
  return getOrCreate(`solar_facade_${baseColorHex}_${accentGlowHex}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Warm stucco/limestone base
    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle plaster texture
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }

    const floorH = 96;
    const bayW = 64;

    // Floor moldings and cornices
    for (let y = 0; y <= 512; y += floorH) {
      // Dark bronze relief cornice
      ctx.fillStyle = '#4a3720';
      ctx.fillRect(0, y - 8, 512, 16);

      // Gold solar inlay line
      ctx.fillStyle = accentGlowHex;
      ctx.fillRect(0, y - 2, 512, 4);
    }

    // Windows with arched tops and bronze louvers
    for (let y = 18; y < 512; y += floorH) {
      for (let x = 12; x < 512; x += bayW) {
        const winW = 40;
        const winH = 58;

        // Bronze architectural outer frame
        ctx.fillStyle = '#2b2114';
        ctx.fillRect(x - 3, y - 3, winW + 6, winH + 6);

        // Deep blue photovoltaic glass
        const grad = ctx.createLinearGradient(x, y, x + winW, y + winH);
        grad.addColorStop(0, '#0a1d37');
        grad.addColorStop(0.5, '#0e2b4f');
        grad.addColorStop(1, '#051124');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, winW, winH);

        // Gold circuit traces / photovoltaic micro-grid
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + winH / 2);
        ctx.lineTo(x + winW - 4, y + winH / 2);
        ctx.moveTo(x + winW / 2, y + 4);
        ctx.lineTo(x + winW / 2, y + winH - 4);
        ctx.stroke();

        // Mediterranean sun-shading louvers (top half)
        ctx.fillStyle = '#7a5a2b';
        for (let l = y + 4; l < y + 26; l += 6) {
          ctx.fillRect(x + 2, l, winW - 4, 3);
        }

        // Sill
        ctx.fillStyle = '#deb44c';
        ctx.fillRect(x - 4, y + winH + 2, winW + 8, 4);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}

/**
 * Photovoltaic hexagonal solar panel array texture with gold contact buses.
 */
export function createPhotovoltaicPanelTexture(): THREE.CanvasTexture {
  return getOrCreate('photovoltaic_solar_array', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Deep space/high-efficiency navy blue
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, 512, 512);

    // Silicon wafer crystal shimmer
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = 'rgba(20, 60, 120, 0.15)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 4);
    }

    // Grid cells
    const cell = 64;
    for (let x = 0; x < 512; x += cell) {
      for (let y = 0; y < 512; y += cell) {
        // Chamfered silicon cell border
        ctx.strokeStyle = '#040b17';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);

        // Thin silver finger lines
        ctx.strokeStyle = 'rgba(150, 190, 255, 0.35)';
        ctx.lineWidth = 1;
        for (let fy = y + 8; fy < y + cell; fy += 8) {
          ctx.beginPath();
          ctx.moveTo(x + 2, fy);
          ctx.lineTo(x + cell - 2, fy);
          ctx.stroke();
        }

        // Gold busbars
        ctx.fillStyle = '#ffc72c';
        ctx.fillRect(x + 18, y + 2, 2, cell - 4);
        ctx.fillRect(x + cell - 20, y + 2, 2, cell - 4);
      }
    }

    // Outer anodized yellow/gold aluminum frame
    ctx.strokeStyle = '#ffd000';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 506, 506);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}

/**
 * Solar Citadel banner / heraldic tapestry texture.
 */
export function createSolarCitadelBannerTexture(bannerTitle = 'SOLAR SECTOR'): THREE.CanvasTexture {
  return getOrCreate(`solar_banner_${bannerTitle}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Rich saffron & golden yellow gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#fca311');
    grad.addColorStop(0.5, '#e85d04');
    grad.addColorStop(1, '#9d0208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    // Gold geometric border
    ctx.strokeStyle = '#ffd000';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 492);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 220, 476);

    // Radiant Sun Emblem
    ctx.save();
    ctx.translate(128, 140);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();

    // Sun Rays
    for (let r = 0; r < 12; r++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.fillStyle = r % 2 === 0 ? '#ffd700' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-6, -42);
      ctx.lineTo(0, -68);
      ctx.lineTo(6, -42);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Geometric chevrons
    ctx.fillStyle = '#ffd000';
    for (let y = 240; y <= 340; y += 32) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(128, y + 24);
      ctx.lineTo(216, y);
      ctx.lineTo(128, y + 14);
      ctx.closePath();
      ctx.fill();
    }

    // Title Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(bannerTitle, 128, 410);

    ctx.fillStyle = '#ffea00';
    ctx.font = '12px Courier New';
    ctx.fillText('HELIOS GRID // SECTOR 07', 128, 436);

    // Bottom fringe swallowtail
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.lineTo(128, 480);
    ctx.lineTo(256, 512);
    ctx.lineTo(0, 512);
    ctx.closePath();
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  });
}

/**
 * Deadshot-style Italian Travertine Paving Texture for Vatican Piazza.
 * Features grand cut limestone slabs, crisp mortar joints, and radial marble banding.
 */
export function createTravertinePiazzaTexture(): THREE.CanvasTexture {
  return getOrCreate('vatican_travertine_piazza', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Warm travertine ivory base
    ctx.fillStyle = '#dfd6c3';
    ctx.fillRect(0, 0, 1024, 1024);

    // Stone texture grain & mineral flecks
    for (let i = 0; i < 6000; i++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 1024;
      const shade = Math.random();
      ctx.fillStyle = shade > 0.6 ? '#f2ecde' : shade > 0.3 ? '#cfc4af' : '#b8ac96';
      ctx.fillRect(rx, ry, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }

    // Cut stone slab grid (large classical Roman pavers: 128x128)
    ctx.strokeStyle = '#a89c85';
    ctx.lineWidth = 3;
    for (let x = 0; x < 1024; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y < 1024; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Inner tile bevel / chamfer highlight
    ctx.strokeStyle = '#fff8eb';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < 1024; x += 128) {
      for (let y = 0; y < 1024; y += 128) {
        ctx.strokeRect(x + 2, y + 2, 124, 124);
      }
    }

    // Radial white Carrara marble decorative border strip
    ctx.fillStyle = '#f8f4ec';
    ctx.fillRect(496, 0, 32, 1024);
    ctx.fillRect(0, 496, 1024, 32);

    ctx.strokeStyle = '#998d78';
    ctx.lineWidth = 2;
    ctx.strokeRect(496, 0, 32, 1024);
    ctx.strokeRect(0, 496, 1024, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  });
}

/**
 * Classical St. Peter's Basilica Facade Texture.
 * Features grand arched windows with decorative keystones, pilaster fluting,
 * Roman ashlar stonework, and gold ornamental cornice lines.
 */
export function createClassicalBasilicaFacadeTexture(): THREE.CanvasTexture {
  return getOrCreate('vatican_basilica_facade', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Warm Roman limestone base
    ctx.fillStyle = '#e8decb';
    ctx.fillRect(0, 0, 1024, 1024);

    // Stone block ashlar bond seams
    ctx.strokeStyle = '#b8aa92';
    ctx.lineWidth = 3;
    const rowH = 64;
    for (let y = 0; y < 1024; y += rowH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();

      const offset = (y / rowH) % 2 === 0 ? 0 : 64;
      for (let x = offset; x < 1024; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
        ctx.stroke();
      }
    }

    // Classical Arched Windows (2 grand tiers)
    const windowCols = [128, 384, 640, 896];
    const windowRows = [220, 580];

    windowRows.forEach(wy => {
      windowCols.forEach(wx => {
        // Window stone trim casing
        ctx.fillStyle = '#d5c7b0';
        ctx.fillRect(wx - 48, wy - 90, 96, 180);

        // Window arch top
        ctx.beginPath();
        ctx.arc(wx, wy - 90, 48, Math.PI, 0);
        ctx.fill();

        // Dark reflective glass
        ctx.fillStyle = '#1b263b';
        ctx.fillRect(wx - 36, wy - 80, 72, 160);
        ctx.beginPath();
        ctx.arc(wx, wy - 80, 36, Math.PI, 0);
        ctx.fill();

        // Window muntin grid & arch fanlight (classical gold/bronze)
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(wx, wy - 116);
        ctx.lineTo(wx, wy + 80);
        ctx.moveTo(wx - 36, wy);
        ctx.lineTo(wx + 36, wy);
        ctx.moveTo(wx - 36, wy - 40);
        ctx.lineTo(wx + 36, wy - 40);
        ctx.moveTo(wx - 36, wy + 40);
        ctx.lineTo(wx + 36, wy + 40);
        ctx.stroke();

        // Decorative stone keystone above arch
        ctx.fillStyle = '#fff9ed';
        ctx.beginPath();
        ctx.moveTo(wx - 10, wy - 146);
        ctx.lineTo(wx + 10, wy - 146);
        ctx.lineTo(wx + 14, wy - 126);
        ctx.lineTo(wx - 14, wy - 126);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    });

    // Grand Classical Entablature & Cornice Band
    ctx.fillStyle = '#d9ccb6';
    ctx.fillRect(0, 0, 1024, 70);
    ctx.fillRect(0, 420, 1024, 40);

    // Classical Dentil Moulding & Gold Inscription Frieze
    ctx.fillStyle = '#c7b89f';
    for (let x = 12; x < 1024; x += 28) {
      ctx.fillRect(x, 48, 16, 18);
    }

    ctx.fillStyle = '#b89c30';
    ctx.font = 'bold 26px Times New Roman, serif';
    ctx.textAlign = 'center';
    ctx.fillText('IN HONOREM PRINCIPIS APOST PAVLVS V BVRGHESIVS', 512, 450);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}

/**
 * Classical Fluted Marble Column Texture.
 */
export function createFlutedColumnTexture(): THREE.CanvasTexture {
  return getOrCreate('vatican_fluted_column', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Marble stone base
    ctx.fillStyle = '#eae2d3';
    ctx.fillRect(0, 0, 512, 512);

    // Vertical classical Doric/Ionic fluting channels
    const flutes = 16;
    const fluteW = 512 / flutes;
    for (let i = 0; i < flutes; i++) {
      const cx = i * fluteW + fluteW / 2;
      const grad = ctx.createLinearGradient(i * fluteW, 0, (i + 1) * fluteW, 0);
      grad.addColorStop(0, '#beaf98');
      grad.addColorStop(0.3, '#ddd2bf');
      grad.addColorStop(0.5, '#f5efe4');
      grad.addColorStop(0.7, '#ddd2bf');
      grad.addColorStop(1, '#beaf98');
      ctx.fillStyle = grad;
      ctx.fillRect(i * fluteW + 2, 0, fluteW - 4, 512);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 4);
    return tex;
  });
}

/**
 * Suburban Horizontal Siding Texture for Nuketown.
 */
export function createSuburbanSidingTexture(baseColorHex = '#4da699', trimColorHex = '#34756c'): THREE.CanvasTexture {
  return getOrCreate(`nuketown_siding_${baseColorHex}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 512, 512);

    const boardH = 32;
    for (let y = 0; y < 512; y += boardH) {
      // Board drop shadow
      ctx.fillStyle = trimColorHex;
      ctx.fillRect(0, y + boardH - 4, 512, 4);

      // Board top edge highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(0, y, 512, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  });
}

/**
 * Garage Door Horizontal Panel Texture.
 */
export function createGarageDoorTexture(): THREE.CanvasTexture {
  return getOrCreate('nuketown_garage_door', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f0ede6';
    ctx.fillRect(0, 0, 512, 512);

    const sectionH = 128;
    for (let y = 0; y < 512; y += sectionH) {
      // Panel separator rubber seam
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(0, y, 512, 6);

      // Embossed rectangular relief panels
      for (let x = 24; x < 512; x += 120) {
        ctx.strokeStyle = '#b8b2a5';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y + 20, 96, 88);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 22, 92, 84);
      }
    }

    return new THREE.CanvasTexture(canvas);
  });
}

/**
 * Japanese Wet Cobblestone Texture for Osaka.
 */
export function createWetCobblestoneTexture(): THREE.CanvasTexture {
  return getOrCreate('osaka_wet_cobbles', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#151720';
    ctx.fillRect(0, 0, 512, 512);

    const stoneSize = 32;
    for (let y = 0; y < 512; y += stoneSize) {
      const offset = (y / stoneSize) % 2 === 0 ? 0 : 16;
      for (let x = -16 + offset; x < 512; x += stoneSize) {
        ctx.fillStyle = Math.random() > 0.5 ? '#242838' : '#1c1f2e';
        ctx.fillRect(x + 2, y + 2, stoneSize - 4, stoneSize - 4);

        // Wet glossy top edge
        ctx.fillStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.fillRect(x + 3, y + 3, stoneSize - 6, 4);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  });
}

/**
 * Deadshot Corrugated Shipping Container Texture.
 */
export function createDeadshotContainerTexture(baseColorHex = '#0984e3', stenciledCode = 'DS-NAV-01'): THREE.CanvasTexture {
  return getOrCreate(`container_${baseColorHex}_${stenciledCode}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Base paint
    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 512, 256);

    // Corrugated vertical ribs
    const ribWidth = 16;
    for (let x = 0; x < 512; x += ribWidth) {
      // Highlight rib face
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(x, 0, ribWidth * 0.45, 256);
      // Dark shadow recess
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(x + ribWidth * 0.5, 0, ribWidth * 0.5, 256);
    }

    // Heavy steel perimeter border frame
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, 512, 14);
    ctx.fillRect(0, 256 - 14, 512, 14);
    ctx.fillRect(0, 0, 14, 256);
    ctx.fillRect(512 - 14, 0, 14, 256);

    // Industrial Stencil Code
    ctx.save();
    ctx.font = '900 28px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.textAlign = 'left';
    ctx.fillText(stenciledCode, 36, 68);

    // Technical capacity stencils
    ctx.font = '700 12px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('MAX GROSS: 30,480 KG', 36, 96);
    ctx.fillText('TARE WT:    2,180 KG', 36, 114);
    ctx.fillText('PAYLOAD:   28,300 KG', 36, 132);

    // Hazard warning stripes in corner
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(380, 40, 90, 28);
    ctx.fillStyle = '#111111';
    for (let i = 0; i < 90; i += 18) {
      ctx.beginPath();
      ctx.moveTo(380 + i, 40);
      ctx.lineTo(380 + i + 10, 40);
      ctx.lineTo(380 + i, 68);
      ctx.lineTo(380 + i - 10, 68);
      ctx.fill();
    }
    ctx.restore();

    return new THREE.CanvasTexture(canvas);
  });
}


