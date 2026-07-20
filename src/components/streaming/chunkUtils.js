import * as THREE from 'three';

export function getChunkCandidatesFromScene(scene, { chunkNameRegex }) {
  if (!scene) return [];

  const candidates = [];
  scene.traverse((child) => {
    // Chunk é um Group (normalmente), mas aceitamos qualquer objeto
    // com name Chunk_.. e que tenha children.
    if (!child?.name) return;
    if (!chunkNameRegex.test(child.name)) return;

    candidates.push(child);
  });

  return candidates;
}

function computeLocalBoundsFromObject(object3D) {
  const box = new THREE.Box3().setFromObject(object3D);
  if (!box || !box.isFinite()) return null;
  return box;
}

export function buildChunkIndexFromCandidates(candidates) {
  return candidates
    .map((group) => {
      const userData = group.userData || {};
      const chunkX = userData.chunkX ?? null;
      const chunkZ = userData.chunkZ ?? null;

      let center = Array.isArray(userData.center) ? userData.center : null;
      let size = typeof userData.size === 'number' ? userData.size : null;
      let bounds = userData.bounds ?? null;

      if (!center) {
        // fallback: inferir center via bounds do Three
        const box = computeLocalBoundsFromObject(group);
        if (box) {
          center = [
            (box.min.x + box.max.x) / 2,
            (box.min.y + box.max.y) / 2,
            (box.min.z + box.max.z) / 2,
          ];
        }
      }

      return {
        key: group.name,
        name: group.name,
        group,
        userData: {
          chunkX,
          chunkZ,
          center,
          size,
          bounds,
        },
      };
    })
    .filter((c) => c.group);
}

export function getChunkCenterWorld(chunk) {
  const { center } = chunk.userData;
  if (!Array.isArray(center)) return null;

  const v = new THREE.Vector3(center[0], center[1], center[2]);
  // center vem em coordenadas do mundo? Você disse que é userData com center [x,y,z]
  // Tratamos como mundo, mas se não for, a transformação abaixo ajuda quando center é local.
  // Se userData.center já for world-space, a transformação via local->world não muda muito.
  // Para ser mais seguro, calculamos transform apenas se group tem matriz:
  // (no GLB, o group geralmente já está no mundo; nesse caso ainda funciona.)
  return v;
}

export function distXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function setChunkActive(chunk, { active, mode }) {
  // mode define a “política” de desligar.
  // Por enquanto: desligar renderização e deixar ganchos prontos pra simulação/IA/animações.
  const group = chunk.group;
  if (!group) return;

  if (mode === 'visibility') {
    group.visible = active;
    group.traverse((obj) => {
      if (obj && obj.isMesh) obj.visible = active;
    });
    return;
  }

  if (mode === 'renderOff') {
    // Evita depender de obj.visible apenas; usamos um flag consistente.
    group.visible = true; // mantém o grafo "no lugar".

    group.traverse((obj) => {
      if (!obj) return;

      // Render
      if (obj.isMesh) {
        obj.visible = active;
        obj.frustumCulled = active;
      }

      // Materiais: útil quando há complexidades de transparência.
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => {
            if (m && typeof m === 'object' && 'visible' in m) m.visible = active;
          });
        } else {
          if ('visible' in obj.material) obj.material.visible = active;
        }
      }

      // Hooks futuros: simulação/IA/animações
      if (typeof obj.setSimulationActive === 'function') {
        obj.setSimulationActive(active);
      }
      if (typeof obj.setAIActive === 'function') {
        obj.setAIActive(active);
      }
      if (typeof obj.setAnimationsActive === 'function') {
        obj.setAnimationsActive(active);
      }
    });

    // Um flag geral no group para módulos futuros consultarem
    group.userData.streaming = { active };
  }
}

