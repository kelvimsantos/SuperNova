import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

const SceneObject = ({ data }) => {
  const rotation = Array.isArray(data.rotation) ? data.rotation : [0, 0, 0];
  const { scene } = useGLTF(data.modelPath);
  const modelRef = useRef();

  useEffect(() => {
    if (modelRef.current) {
      const box = new THREE.Box3().setFromObject(modelRef.current);
      console.log('Bounding box do modelo:', box.min, box.max);
    }
  }, []);

  const colliderSize = [0.5, 1.0, 0.5];
  const colliderOffset = [0, 0.5, 0];

  return (
    <RigidBody
      position={data.position}
      rotation={rotation}
      type="fixed"
      colliders={false}
    >
      {/* Modelo visual COM SOMBRAS */}
      <group ref={modelRef} scale={data.scale}>
        <primitive object={scene.clone()} castShadow receiveShadow />
      </group>

      {/* Collider manual */}
     {/* <CuboidCollider
        args={colliderSize}
        position={colliderOffset}
        rotation={rotation}
      />*/}

      {/* Debug: cubo wireframe 
      <mesh visible={false} position={colliderOffset} rotation={rotation}>
        <boxGeometry args={colliderSize.map(s => s * 2)} />
        <meshStandardMaterial color="red" wireframe />
      </mesh> */}
    </RigidBody>
  );
};

export const LoadedScene = ({ sceneData }) => {
  if (!sceneData || !sceneData.objects) return null;
  return (
    <>
      {sceneData.objects.map(obj => (
        <SceneObject key={obj.id} data={obj} />
      ))}
    </>
  );
};