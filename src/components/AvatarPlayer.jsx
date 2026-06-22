// src/components/AvatarPlayer.jsx
import { useRef, useEffect, useState } from 'react';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3, Raycaster } from 'three';
import useGameStore from '../hooks/useGameStore';

const AVATAR_MODEL_PATH = '/models/avatar/body.glb';
const HAIR_BASE_PATH = '/models/avatar/hair/hair-';

// 🔥 ESCALA
const AVATAR_SCALE = 0.006;

// 🔥 POSIÇÕES ORIGINAIS DO CABELO
const HAIR_POSITIONS = {
  0: { y: -175.1 },  // Cabelo 1
  1: { y: -195.1 },  // Cabelo 2
  2: { y: -195.1 },  // Cabelo 3
  3: { y: -195.1 },  // Cabelo 4
  4: { y: -180.1 },  // Cabelo 5
  5: { y: -195.1 },  // Cabelo 6
  6: { y: -175.1 }   // Cabelo 7
};

// 🔥 AJUSTE DO CABELO (subir no Y) - MEXA AQUI
const HAIR_Y_OFFSET = -10; // AUMENTE ESTE VALOR PARA SUBIR O CABELO

// 🔥 ESCALA DO CABELO
const HAIR_SCALE_FACTOR = 0.8;

export const AvatarPlayer = ({ userId, avatarConfig, loadingAvatar }) => {
  const rigidBodyRef = useRef();
  const visualRef = useRef();
  const bodyModelRef = useRef(null);
  const hairModelRef = useRef(null);
  const moveDir = useRef({ x: 0, z: 0 });
  const [isGrounded, setIsGrounded] = useState(true);
  
  const setPlayerRigidBody = useGameStore((state) => state.setPlayerRigidBody);
  const currentAnim = useRef('idle2');
  const isNight = useGameStore((state) => state.isNight);
  const currentScene = useGameStore((state) => state.currentScene);
  const worldGroupRef = useGameStore((state) => state.worldGroupRef);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const playerHealth = useGameStore((state) => state.playerHealth);
  const isDead = playerHealth <= 0;

  // 🔥 NOVO: Ref para controlar tentativas de desengate
  const stuckAttempts = useRef(0);
  const lastStuckTime = useRef(0);

  const { scene: bodyScene, animations } = useGLTF(AVATAR_MODEL_PATH);
  
  const hairIndex = avatarConfig?.hairIndex ?? -1;
  const hairPath = hairIndex >= 0 ? `${HAIR_BASE_PATH}${String(hairIndex + 1).padStart(2, '0')}.glb` : null;
  const { scene: hairScene } = useGLTF(hairPath || '');
  
  const { actions } = useAnimations(animations, bodyModelRef);

  const playAnimation = (name) => {
    if (!actions || !actions[name] || currentAnim.current === name) return;
    Object.values(actions).forEach(action => action.stop());
    actions[name].reset().play();
    currentAnim.current = name;
  };

  useEffect(() => {
    if (animations && animations.length > 0) {
      console.log('🎬 Animações disponíveis no avatar:');
      animations.forEach((anim, i) => {
        console.log(`  ${i+1}. "${anim.name}"`);
      });
    }
  }, [animations]);

  function findHeadBone(model) {
    let headBone = null;
    model.traverse((child) => {
      if (child.isBone) {
        const nameLower = child.name.toLowerCase();
        if (nameLower.includes('head') || 
            nameLower.includes('cabeça') || 
            nameLower === 'mixamorig:head' ||
            nameLower === 'mixamorighead') {
          headBone = child;
        }
      }
    });
    return headBone;
  }

  useEffect(() => {
    if (!bodyModelRef.current || !avatarConfig) return;
    const skinColor = avatarConfig.skinColor || '#f1c27d';
    bodyModelRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          if (mat.color) mat.color.set(skinColor);
          if (mat.roughness !== undefined) mat.roughness = 1;
          if (mat.metalness !== undefined) mat.metalness = 0;
          mat.needsUpdate = true;
        });
      }
    });
  }, [bodyModelRef, avatarConfig]);

  useEffect(() => {
    if (!hairModelRef.current || !avatarConfig) return;
    const hairColor = avatarConfig.hairColor || '#4a2c2c';
    hairModelRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          if (mat.color) mat.color.set(hairColor);
          mat.needsUpdate = true;
        });
      }
    });
  }, [hairModelRef, avatarConfig]);

  // 🔥 POSICIONA O CABELO NO OSSO DA CABEÇA
  useEffect(() => {
    if (!bodyModelRef.current || !hairModelRef.current) return;
    
    const headBone = findHeadBone(bodyModelRef.current);
    const baseY = HAIR_POSITIONS[hairIndex]?.y || -175.1;
    // 🔥 SÓ MEXA AQUI PARA SUBIR/DESCER O CABELO
    const posY = baseY + HAIR_Y_OFFSET;
    
    if (headBone) {
      const parent = hairModelRef.current.parent;
      if (parent) parent.remove(hairModelRef.current);
      headBone.add(hairModelRef.current);
      
      // 🔥 POSIÇÃO DO CABELO
      hairModelRef.current.position.set(0, posY, 0);
      hairModelRef.current.rotation.set(0, 0, 0);
      
      const hairScale = HAIR_SCALE_FACTOR / AVATAR_SCALE;
      hairModelRef.current.scale.set(hairScale, hairScale, hairScale);
      
      console.log(`💇 Cabelo Y=${posY}`);
    }
  }, [bodyModelRef, hairModelRef, hairIndex]);

  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.currentMoveDir = moveDir;
      setPlayerRigidBody(rigidBodyRef.current);
    }
    return () => setPlayerRigidBody(null);
  }, [setPlayerRigidBody]);

  const findGroundAndAdjust = () => {
    if (!rigidBodyRef.current || !worldGroupRef?.current || isAdjusting) return;
    setIsAdjusting(true);

    const currentPos = rigidBodyRef.current.translation();
    const raycaster = new Raycaster();

    const tryFindGround = (startY) => {
      return new Promise((resolve) => {
        let foundGround = false;
        let groundY = null;

        for (let yOffset = 0; yOffset <= 120; yOffset += 5) {
          const origin = new Vector3(currentPos.x, startY + yOffset, currentPos.z);
          const direction = new Vector3(0, -1, 0);
          raycaster.set(origin, direction);

          const allObjects = [];
          const collectObjects = (obj) => {
            if (obj.isMesh && obj.visible) allObjects.push(obj);
            if (obj.children) obj.children.forEach(child => collectObjects(child));
          };

          if (worldGroupRef.current) collectObjects(worldGroupRef.current);

          for (const obj of allObjects) {
            const intersects = raycaster.intersectObject(obj, true);
            if (intersects.length > 0) {
              const hitPoint = intersects[0].point;
              if (groundY === null || hitPoint.y > groundY) {
                groundY = hitPoint.y;
                foundGround = true;
              }
            }
          }

          if (foundGround) break;
        }

        resolve({ foundGround, groundY });
      });
    };

    const epsilon = 0.015;

    tryFindGround(currentPos.y).then(({ foundGround, groundY }) => {
      if (foundGround && groundY !== null) {
        const vel = rigidBodyRef.current.linvel();
        const horizontalSpeed = Math.sqrt((vel.x * vel.x) + (vel.z * vel.z));
        const CONTACT_EPSILON = 0.02;
        const targetY = groundY + CONTACT_EPSILON;
        const currentY = currentPos.y;
        const delta = targetY - currentY;
        const deltaAbs = Math.abs(delta);
        const snapDistance = 0.1;
        const shouldForceSnap = deltaAbs > snapDistance;
        const speedThreshold = 0.05;
        const shouldSnapY = horizontalSpeed < speedThreshold;

        if (deltaAbs > epsilon && (shouldForceSnap || shouldSnapY)) {
          rigidBodyRef.current.setTranslation(
            { x: currentPos.x, y: targetY, z: currentPos.z },
            true
          );
        }
      } else {
        const newY = currentPos.y + 0.1;
        rigidBodyRef.current.setTranslation({ x: currentPos.x, y: newY, z: currentPos.z }, true);
        setTimeout(() => {
          setIsAdjusting(false);
          findGroundAndAdjust();
        }, 500);
        return;
      }

      setIsAdjusting(false);
    });
  };

  // 🔥 NOVO: Função para detectar e resolver travamento em quinas
  const checkAndResolveStuck = () => {
    if (!rigidBodyRef.current) return;
    
    const vel = rigidBodyRef.current.linvel();
    const horizontalSpeed = Math.sqrt((vel.x * vel.x) + (vel.z * vel.z));
    const isMoving = moveDir.current.x !== 0 || moveDir.current.z !== 0;
    
    // Detecta se está travado (tentando andar mas sem velocidade)
    if (isMoving && horizontalSpeed < 0.01) {
      const now = Date.now();
      
      // Limita a frequência das tentativas
      if (now - lastStuckTime.current < 100) return;
      lastStuckTime.current = now;
      
      stuckAttempts.current += 1;
      
      // Só aplica correção após 3 tentativas consecutivas
      if (stuckAttempts.current >= 3) {
        // Aplica um pequeno pulo para desengatar
        rigidBodyRef.current.setLinvel({ 
          x: vel.x * 0.5, 
          y: 0.5, 
          z: vel.z * 0.5 
        }, true);
        
        // Reseta o contador
        stuckAttempts.current = 0;
      }
    } else {
      // Se não está travado, reseta o contador
      stuckAttempts.current = 0;
    }
  };

  // 🔥 CHAMADA INICIAL E QUANDO A CENA MUDA
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rigidBodyRef.current && worldGroupRef?.current) {
        findGroundAndAdjust();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentScene, worldGroupRef]);

  // 🔥 VERIFICAÇÃO CONTÍNUA (adicionando a checagem de travamento)
  useFrame(() => {
    if (!rigidBodyRef.current || isAdjusting) return;
    const pos = rigidBodyRef.current.translation();
    
    // Verifica travamento em quinas
    checkAndResolveStuck();
    
    if (pos.y < -10) {
      findGroundAndAdjust();
    }
  });

  // 🔥 VERIFICAÇÃO PERIÓDICA (mantida igual)
  useEffect(() => {
    const interval = setInterval(() => {
      if (rigidBodyRef.current && !isAdjusting && !loadingAvatar) {
        const pos = rigidBodyRef.current.translation();
        if (pos.y > 1) {
          findGroundAndAdjust();
        }
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [loadingAvatar, isAdjusting]);

  useFrame(({ camera }) => {
    if (!rigidBodyRef.current || loadingAvatar) return;
    const position = rigidBodyRef.current.translation();
    setPlayerPosition({ x: position.x, y: position.y, z: position.z });

    const { x: dx, z: dz } = moveDir.current;
    const currentVel = rigidBodyRef.current.linvel();
    const grounded = Math.abs(currentVel.y) < 0.1;
    setIsGrounded(grounded);
    const isMoving = dx !== 0 || dz !== 0;
    
    if (!isMoving) {
      playAnimation(grounded ? 'idle2' : 'Fall');
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
    // Mantém a física do y e só ajusta x/z
    rigidBodyRef.current.setLinvel(
      { x: moveVector.x * speed, y: currentVel.y, z: moveVector.z * speed },
      true
    );

    if (visualRef.current && (dx !== 0 || dz !== 0)) {
      if (moveVector.length() > 0.1) {
        const angle = Math.atan2(moveVector.x, moveVector.z);
        visualRef.current.rotation.y = angle;
      }
    }
  });

  if (loadingAvatar) {
    return (
      <RigidBody ref={rigidBodyRef} mass={1} position={[0, 50, 0]}>
        <CapsuleCollider args={[0.3, 0.4]} />
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="gray" wireframe transparent opacity={0.5} />
        </mesh>
      </RigidBody>
    );
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      mass={1}
      position={[0, 50, 0]}
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
        
        <group ref={visualRef} scale={AVATAR_SCALE} position={[0, -0.7, 0]}>
          <primitive object={bodyScene} ref={bodyModelRef} />
          
          {hairIndex >= 0 && hairScene && (
            <primitive object={hairScene} ref={hairModelRef} />
          )}
        </group>
      </group>
    </RigidBody>
  );
};

export default AvatarPlayer;

useGLTF.preload(AVATAR_MODEL_PATH);