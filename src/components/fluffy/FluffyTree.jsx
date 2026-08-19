import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import { createCanopyMaterial, modifyMaterialForShadows, updateCanopyUniforms } from './fluffyShaders';

useGLTF.preload('models/fluffytree.glb');

// Recria as árvores fluffy a partir da lista exportada no scene.json.
// Cada árvore tem materiais próprios (uTreeCenter por copa), mas os uniforms
// de cor/vento/luz são compartilhados e atualizados a cada frame pela config
// exportada (mesmo comportamento do editor).
const FluffyTreeItem = ({ tree, canopyTexture }) => {
  const { scene } = useGLTF('models/fluffytree.glb');

  const [meshes, setMeshes] = useState([]);
  const [baseY, setBaseY] = useState(0);
  const meshesRef = useRef([]);

  useEffect(() => {
    const clone = scene.clone(true);
    const created = [];
    const treeWorldPos = new THREE.Vector3(...(tree.position || [0, 0, 0]));
    let trunkBase = 0;

    clone.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;

      if (o.name.startsWith('NOVA_COPA')) {
        // Centro da copa em coordenadas locais (a geometria já vem posicionada)
        const box = new THREE.Box3().setFromObject(o);
        const localCenter = box.getCenter(new THREE.Vector3());
        const worldCenter = localCenter.clone().add(treeWorldPos);
        const mat = createCanopyMaterial({ alphaMap: canopyTexture, treeCenter: worldCenter });
        o.material = mat;
        o.userData.shadowRadius = 22;
        created.push(o);
      } else if (o.name === 'TRUNCO') {
        const box = new THREE.Box3().setFromObject(o);
        trunkBase = box.min.y;
        const mat = new THREE.MeshLambertMaterial({ color: 0x713e16, side: THREE.DoubleSide });
        modifyMaterialForShadows(mat);
        o.material = mat;
        o.userData.shadowRadius = 22;
        created.push(o);
      }
    });

    meshesRef.current = created;
    setMeshes(created);
    setBaseY(trunkBase);

    return () => {
      created.forEach((o) => {
        if (o.material) o.material.dispose();
      });
    };
  }, [scene, canopyTexture, tree.position, tree.id]);

  if (meshes.length === 0) return null;

  // Mesmo deslocamento do editor: a base do tronco fica ~4m acima do chão no
  // modelo original; deslocamos para que a árvore fique plantada no ponto do
  // export, com a compensação multiplicada pela escala (senão flutua com
  // escala > 1). Altura reduzida (escala Y 0.8) para ficar mais baixa.
  const SINK = 0.3;
  const HEIGHT_SCALE = 0.8;
  const pos = tree.position || [0, 0, 0];
  const s = tree.scale ?? 1;

  return (
    <group
      position={[pos[0], pos[1] - baseY * HEIGHT_SCALE * s - SINK, pos[2]]}
      rotation={tree.rotation || [0, 0, 0]}
      scale={[s, s * HEIGHT_SCALE, s]}
    >
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
};

export const FluffyTree = ({ config = {}, trees = [] }) => {
  const canopyTexture = useTexture('models/fluffy_canopy.png');
  const timeRef = useRef(0);

  useEffect(() => {
    if (canopyTexture && canopyTexture.flipY !== false) {
      canopyTexture.flipY = false;
      canopyTexture.needsUpdate = true;
    }
  }, [canopyTexture]);

  useFrame(() => {
    timeRef.current += 0.01;
    updateCanopyUniforms(config, timeRef.current);
  });

  if (!trees || trees.length === 0) return null;

  return (
    <group>
      {trees.map((tree) => (
        <FluffyTreeItem key={tree.id} tree={tree} canopyTexture={canopyTexture} />
      ))}
    </group>
  );
};