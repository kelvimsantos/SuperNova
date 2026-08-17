import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Tree } from '@dgreenheck/ez-tree';
import useGameStore from '../hooks/useGameStore';

const DEFAULT_PRESETS = [
  'Pine Small',
  'Pine Medium',
  'Pine Large',
  'Ash Medium',
  'Oak Small',
];

// 🌲 Árvore procedural estilo EZ-Tree (low-poly, com vento animado).
//    Substitui o pine_tree.glb mantendo a posição do scene.json.
export const ProceduralTree = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  presets = DEFAULT_PRESETS,
  height = 2.6,
  seed,
  cullDistance = 0,
}) => {
  const groupRef = useRef();

  const tree = useMemo(() => {
    const t = new Tree();
    // Seed estável por posição: a mesma árvore sempre que recarregar
    const stableSeed = seed !== undefined
      ? seed
      : Math.abs(Math.round(position[0] * 7919 + position[2] * 104729)) % 100000;
    const preset = presets[stableSeed % presets.length];
    t.loadPreset(preset);
    t.options.seed = stableSeed;
    t.generate();
    // 📏 Escala automática: todos os presets ficam com a mesma altura alvo
    const box = new THREE.Box3().setFromObject(t);
    const h = box.max.y - box.min.y;
    if (h > 0) t.scale.setScalar(height / h);
    console.log(`🌲 [DEBUG] Árvore procedural: preset="${preset}" seed=${stableSeed} altura=${h.toFixed(1)} -> ${height}`);
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[2], presets, height, seed]);

  useEffect(() => {
    tree.traverse((obj) => {
      if (obj.isMesh) {
        // Galhos projetam sombra; folhas (textura com alpha) não
        obj.castShadow = obj === tree.branchesMesh;
        obj.receiveShadow = false;
      }
    });
    return () => {
      tree.dispose?.();
    };
  }, [tree]);

  useFrame(({ clock }) => {
    // 🌬️ Vento animado das folhas (EZ-Tree)
    tree.update(clock.elapsedTime);

    // 🎯 Culling por distância (opcional)
    if (cullDistance > 0 && groupRef.current) {
      const p = useGameStore.getState().playerPosition;
      if (p) {
        const dx = groupRef.current.position.x - p.x;
        const dz = groupRef.current.position.z - p.z;
        groupRef.current.visible = (dx * dx + dz * dz) < cullDistance * cullDistance;
      }
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={tree} />
    </group>
  );
};