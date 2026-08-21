import { RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import useGameStore from '../hooks/useGameStore';

export const World = () => {
  const currentScene = useGameStore((state) => state.currentScene);
  const isNight = useGameStore((state) => state.isNight);
  // 🔥 Cores originais dos materiais do terreno (para restaurar de dia)
  const originalColors = useRef(new Map());

  // Define o caminho do GLB baseado na cena atual
  let path;
  if (currentScene === 'default') {
    path = '/world.glb';
  } else {
    path = `/scenes/${currentScene}/world.glb`;
  }

  const { scene } = useGLTF(path);

  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child.isMesh) {
        // 🔥 MARCAÇÃO DE TERRENO: usada pelo ZombiePool para fazer raycast
        //    SOMENTE no chão real do GLB (evita acertar slimes/player/itens
        //    que também vivem dentro do worldGroupRef e fazem o zumbi flutuar).
        child.userData.isTerrain = true;

        child.receiveShadow = true;
        child.castShadow = false;

        if (child.material) {
          if (!(child.material instanceof THREE.MeshStandardMaterial)) {
            const oldMat = child.material;

            child.material = new THREE.MeshStandardMaterial({
              map: oldMat.map,
              color: oldMat.color,
              roughness: 0.7,
              metalness: 0.1,
              emissive: 0x000000,
              emissiveIntensity: 0,
            });
          } else {
            child.material.emissive = new THREE.Color(0x000000);
            child.material.emissiveIntensity = 0;
          }

          child.material.needsUpdate = true;
        }
      }
    });
  }, [scene, currentScene]);

  // 🔥 TINT NOTURNO no chão: à noite o terreno escurece e ganha tom
  //    azul-roxo escuro (mesma "mudança de cor" que o nublado causa de dia,
  //    mas pro lado da madrugada). De dia, volta à cor original.
  useEffect(() => {
    if (!scene) return;
    const nightTint = new THREE.Color(0x4a4aad);
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (!originalColors.current.has(mat)) {
            originalColors.current.set(mat, mat.color.clone());
          }
          const orig = originalColors.current.get(mat);
          if (isNight) {
            mat.color.copy(orig).multiply(nightTint);
          } else {
            mat.color.copy(orig);
          }
          mat.needsUpdate = true;
        });
      }
    });
  }, [scene, isNight]);

  if (!scene) return null;

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={scene} />
    </RigidBody>
  );
};