import { useRef, useEffect, useState } from 'react';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3 } from 'three';
import useGameStore from '../hooks/useGameStore';

const MODEL_PATH = '/models/player.glb';

export const Player = () => {
  const rigidBodyRef = useRef();
  const visualRef = useRef();
  const moveDir = useRef({ x: 0, z: 0 });
  const [isGrounded, setIsGrounded] = useState(true);
  const setPlayerRigidBody = useGameStore((state) => state.setPlayerRigidBody);
  const currentAnim = useRef('Idle');
  const isNight = useGameStore((state) => state.isNight);

  const { scene, animations } = useGLTF(MODEL_PATH);
  const { actions } = useAnimations(animations, visualRef);
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.currentMoveDir = moveDir;
      setPlayerRigidBody(rigidBodyRef.current);
    }
    return () => setPlayerRigidBody(null);
  }, [setPlayerRigidBody]);

  const playAnimation = (name) => {
    if (!actions || !actions[name] || currentAnim.current === name) return;
    Object.values(actions).forEach(action => action.stop());
    actions[name].reset().play();
    currentAnim.current = name;
  };

  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);

  useFrame(({ camera }) => {
    if (!rigidBodyRef.current) return;

    const position = rigidBodyRef.current.translation();
    setPlayerPosition({ x: position.x, y: position.y, z: position.z });

    const { x: dx, z: dz } = moveDir.current;
    const currentVel = rigidBodyRef.current.linvel();

    const grounded = Math.abs(currentVel.y) < 0.1;
    setIsGrounded(grounded);

    const isMoving = dx !== 0 || dz !== 0;
    if (!isMoving) {
      playAnimation(grounded ? 'Idle' : 'Crouch');
    } else {
      playAnimation('Run');
    }

    const cameraDirection = new Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    const right = new Vector3(-cameraDirection.z, 0, cameraDirection.x);
    const moveVector = new Vector3();
    moveVector.x += cameraDirection.x * dz;
    moveVector.z += cameraDirection.z * dz;
    moveVector.x += right.x * dx;
    moveVector.z += right.z * dx;
    
    if (moveVector.length() > 0) moveVector.normalize();

    const speed = 2;
    rigidBodyRef.current.setLinvel(
      {
        x: moveVector.x * speed,
        y: currentVel.y,
        z: moveVector.z * speed,
      },
      true
    );

    if (visualRef.current && (dx !== 0 || dz !== 0)) {
      if (moveVector.length() > 0.1) {
        const angle = Math.atan2(moveVector.x, moveVector.z);
        visualRef.current.rotation.y = angle;
      }
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      mass={1}
      position={[0, 1.5, 0]}
      linearDamping={0.5}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[0.3, 0.4]} />
      <group>
        {isNight && (
          <pointLight
            intensity={3.2}
            distance={2}
            decay={5}
            color={0xffaa66}
            position={[0, 0.5, 0]}
          />
        )}
        <mesh visible={false}>
          <boxGeometry args={[0.2, 0.5, 0.2]} />
          <meshStandardMaterial color="hotpink" />
        </mesh>
        <group ref={visualRef} scale={0.25} position={[0, -0.7, 0]}>
          <primitive object={scene} />
        </group>
      </group>
    </RigidBody>
  );
};

useGLTF.preload(MODEL_PATH);