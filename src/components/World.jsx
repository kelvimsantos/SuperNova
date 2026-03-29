import { RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';

export const World = () => {
  const { scene } = useGLTF('/models/terreno2.glb');
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          // Força material padrão sem emissão
          if (!(child.material instanceof THREE.MeshStandardMaterial)) {
            const oldMat = child.material;
            const newMat = new THREE.MeshStandardMaterial({
              map: oldMat.map,
              color: oldMat.color,
              roughness: 0.7,
              metalness: 0.1,
              emissive: 0x000000,
              emissiveIntensity: 0,
            });
            child.material = newMat;
          } else {
            child.material.emissive = new THREE.Color(0x000000);
            child.material.emissiveIntensity = 0;
          }
          child.material.needsUpdate = true;
        }
      }
    });
  }, [scene]);

  return (
    <>
      <RigidBody type="fixed" colliders="trimesh">
        <primitive object={scene} receiveShadow={true} castShadow={false} />
      </RigidBody>

      {/* Cubo de referência vermelho */}
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="red" emissive="darkred" />
      </mesh>
    </>
  );
};