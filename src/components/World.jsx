import { RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';
import useGameStore from '../hooks/useGameStore';

export const World = () => {
  const currentScene = useGameStore((state) => state.currentScene);

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

  if (!scene) return null;

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={scene} />
    </RigidBody>
  );
};