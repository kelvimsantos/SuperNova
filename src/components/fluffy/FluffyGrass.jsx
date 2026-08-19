import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { createFluffyGrassMaterial, updateGrassUniforms } from './fluffyShaders';

// Touceira de grama igual ao projeto original: 3 planos em triângulo
// (0°, 60° e 120°) se cruzando, cada um com a textura inteira do campo.
// Dimensões idênticas às do editor (map-editor).
const BLADE_WIDTH = 0.92;
const BLADE_HEIGHT = 0.87;
const BLADE_TWIST = 0.3;

// A grama é dividida em "chunks" com bounding sphere real (calculada a
// partir das instâncias). Assim o three culla os chunks fora do frustum
// (câmera E pass de sombra), em vez de processar os ~1M de vértices do
// campo inteiro a cada frame. Qualidade visual idêntica.
const CHUNK_SIZE = 16;
const TUF_RADIUS = 0.8; // raio extra do tufo (largura 0.92 + twist)

const createTuftGeometry = () => {
  const positions = [];
  const uvs = [];
  const indices = [];
  const half = BLADE_WIDTH / 2;

  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI) / 3;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const base = positions.length / 3;

    const v = (x, z) => [x * c - z * s, 0, x * s + z * c];

    const bl = v(-half, 0);
    const br = v(half, 0);
    const tl = v(-half, BLADE_TWIST);
    const tr = v(half, BLADE_TWIST);

    // Convenção do GLB original (flipY=false): v=0 = topo da textura = ponta da lâmina
    positions.push(bl[0], 0, bl[2], br[0], 0, br[2], tr[0], BLADE_HEIGHT, tr[2], tl[0], BLADE_HEIGHT, tl[2]);
    uvs.push(0, 1, 1, 1, 1, 0, 0, 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

// Recria a grama fluffy a partir das instâncias exportadas no scene.json.
// As posições X/Z vêm do export; o Y é recalculado no heightmap do jogo
// (mesmo padrão do GameGrass), então a grama acompanha o terreno real.
export const FluffyGrass = ({
  config = {},
  instances,
  heightmap,
  terrainSize = 20,
  terrainResolution = 64,
}) => {
  const meshRefs = useRef([]);
  const timeRef = useRef(0);
  const materialRef = useRef(null);

  const tuftGeo = useMemo(() => createTuftGeometry(), []);

  const finalInstances = useMemo(() => {
    if (!instances || !heightmap || !instances.offsets) return null;
    if (instances.offsets.length === 0) return null;

    const step = terrainSize / terrainResolution;
    const width = terrainResolution;
    const count = instances.offsets.length / 3;

    const finalOffsets = [];
    const finalRotations = [];
    const finalScales = [];

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const x = instances.offsets[ix];
      const z = instances.offsets[ix + 2];

      const xi = Math.floor((x + terrainSize / 2) / step);
      const zi = Math.floor((z + terrainSize / 2) / step);
      const idx = zi * (width + 1) + xi;
      const y = heightmap[idx] ?? 0;

      finalOffsets.push(x, y, z);
      finalRotations.push(instances.rotations[i]);
      finalScales.push(instances.scales[i]);
    }

    return {
      offsets: new Float32Array(finalOffsets),
      rotations: new Float32Array(finalRotations),
      scales: new Float32Array(finalScales),
    };
  }, [instances, heightmap, terrainSize, terrainResolution]);

  // Divide as instâncias em chunks com bounding sphere real (para culling
  // de frustum na câmera E na pass de sombra).
  const chunks = useMemo(() => {
    if (!finalInstances) return null;
    const { offsets, rotations, scales } = finalInstances;
    const count = offsets.length / 3;

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < count; i++) {
      const x = offsets[i * 3];
      const z = offsets[i * 3 + 2];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    const cols = Math.max(1, Math.ceil((maxX - minX) / CHUNK_SIZE));
    const rows = Math.max(1, Math.ceil((maxZ - minZ) / CHUNK_SIZE));

    const result = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x0 = minX + c * CHUNK_SIZE;
        const x1 = minX + (c + 1) * CHUNK_SIZE;
        const z0 = minZ + r * CHUNK_SIZE;
        const z1 = minZ + (r + 1) * CHUNK_SIZE;

        const list = [];
        for (let i = 0; i < count; i++) {
          const x = offsets[i * 3];
          const z = offsets[i * 3 + 2];
          if (x >= x0 && x < x1 && z >= z0 && z < z1) list.push(i);
        }
        if (list.length === 0) continue;

        const off = new Float32Array(list.length * 3);
        const rot = new Float32Array(list.length);
        const scl = new Float32Array(list.length);
        let cx = 0;
        let cz = 0;
        for (let j = 0; j < list.length; j++) {
          const i = list[j];
          off[j * 3] = offsets[i * 3];
          off[j * 3 + 1] = offsets[i * 3 + 1];
          off[j * 3 + 2] = offsets[i * 3 + 2];
          rot[j] = rotations[i];
          scl[j] = scales[i];
          cx += offsets[i * 3];
          cz += offsets[i * 3 + 2];
        }

        const n = list.length;
        const center = new THREE.Vector3(cx / n, 0, cz / n);

        let radiusSq = 0;
        for (let j = 0; j < n; j++) {
          const dx = off[j * 3] - center.x;
          const dz = off[j * 3 + 2] - center.z;
          const d = dx * dx + dz * dz;
          if (d > radiusSq) radiusSq = d;
        }

        result.push({
          offsets: off,
          rotations: rot,
          scales: scl,
          count: n,
          center,
          radius: Math.sqrt(radiusSq) + TUF_RADIUS,
        });
      }
    }
    return result;
  }, [finalInstances]);

  const texture = useTexture('models/fluffy_grass.png');

  useEffect(() => {
    if (texture && texture.flipY !== false) {
      texture.flipY = false;
      texture.needsUpdate = true;
    }
  }, [texture]);

  const material = useMemo(() => {
    if (!texture) return null;
    return createFluffyGrassMaterial(texture);
  }, [texture]);

  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  const chunkGeos = useMemo(() => {
    if (!chunks || !tuftGeo) return null;

    return chunks.map((chunk) => {
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = tuftGeo.index;
      geo.attributes.position = tuftGeo.attributes.position;
      geo.attributes.uv = tuftGeo.attributes.uv;
      geo.attributes.normal = tuftGeo.attributes.normal;

      geo.setAttribute('offset', new THREE.InstancedBufferAttribute(chunk.offsets, 3));
      geo.setAttribute('rotation', new THREE.InstancedBufferAttribute(chunk.rotations, 1));
      geo.setAttribute('scale', new THREE.InstancedBufferAttribute(chunk.scales, 1));
      geo.instanceCount = chunk.count;

      // Bounding sphere REAL (as instâncias estão espalhadas pelo chunk);
      // sem isso o three cullaria errado (ou nada) e não teríamos economia.
      geo.boundingSphere = new THREE.Sphere(chunk.center, chunk.radius);

      return geo;
    });
  }, [chunks, tuftGeo]);

  useFrame(() => {
    timeRef.current += 0.01;
    updateGrassUniforms(config, timeRef.current);
  });

  if (!material || !chunkGeos || !chunks) return null;

  return (
    <group>
      {chunkGeos.map((geo, i) => (
        <mesh
          key={i}
          ref={(node) => { meshRefs.current[i] = node; }}
          geometry={geo}
          material={material}
          userData={{ shadowRadius: 16 }}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
};
