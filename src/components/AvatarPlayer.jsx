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
const HAIR_Y_OFFSET = -10;

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
  
  // 🔥 REF PARA CONTROLAR O TEMPO DA ÚLTIMA CORREÇÃO
  const lastStuckCheck = useRef(0);
  const stuckAttempts = useRef(0);

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
    const posY = baseY + HAIR_Y_OFFSET;
    
    if (headBone) {
      const parent = hairModelRef.current.parent;
      if (parent) parent.remove(hairModelRef.current);
      headBone.add(hairModelRef.current);
      
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

  // 🔥 FUNÇÃO PARA DETECTAR E RESOLVER TRAVAMENTO EM QUINAS (SEM AFETAR ROTAÇÃO)
  const detectAndResolveStuck = () => {
    if (!rigidBodyRef.current) return false;
    
    const pos = rigidBodyRef.current.translation();
    const vel = rigidBodyRef.current.linvel();
    const horizontalSpeed = Math.sqrt((vel.x * vel.x) + (vel.z * vel.z));
    
    // Se está parado ou quase parado mas o jogador está tentando andar
    const isMoving = moveDir.current.x !== 0 || moveDir.current.z !== 0;
    const isStuck = isMoving && horizontalSpeed < 0.01;
    
    if (isStuck) {
      const now = Date.now();
      // Limita a frequência das tentativas para não sobrecarregar
      if (now - lastStuckCheck.current < 200) return false;
      lastStuckCheck.current = now;
      
      stuckAttempts.current += 1;
      console.log(`🚧 Detectado travamento em quina (tentativa ${stuckAttempts.current})...`);
      
      // 🔥 ESTRATÉGIA 1: Pequeno pulo para desengatar (mantém rotação)
      rigidBodyRef.current.setLinvel({ x: vel.x, y: 0.8, z: vel.z }, true);
      
      // 🔥 ESTRATÉGIA 2: Após o pulo, aplica um impulso na direção do movimento
      setTimeout(() => {
        if (rigidBodyRef.current) {
          const newPos = rigidBodyRef.current.translation();
          const newVel = rigidBodyRef.current.linvel();
          const newSpeed = Math.sqrt((newVel.x * newVel.x) + (newVel.z * newVel.z));
          
          if (newSpeed < 0.05) {
            // Aplica impulso na direção que o jogador está tentando ir
            const moveX = moveDir.current.x;
            const moveZ = moveDir.current.z;
            const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
            
            if (magnitude > 0.01) {
              const normalizedX = moveX / magnitude;
              const normalizedZ = moveZ / magnitude;
              const pushForce = 0.5;
              
              rigidBodyRef.current.setLinvel({
                x: normalizedX * pushForce,
                y: 0.2,
                z: normalizedZ * pushForce
              }, true);
            } else {
              // Se não tem direção definida, tenta uma direção aleatória
              const angle = Math.random() * Math.PI * 2;
              const pushForce = 0.3;
              rigidBodyRef.current.setLinvel({
                x: Math.cos(angle) * pushForce,
                y: 0.2,
                z: Math.sin(angle) * pushForce
              }, true);
            }
            
            // 🔥 ESTRATÉGIA 3: Pequeno teleporte para cima (mantém posição XZ)
            setTimeout(() => {
              if (rigidBodyRef.current) {
                const finalPos = rigidBodyRef.current.translation();
                rigidBodyRef.current.setTranslation({
                  x: finalPos.x,
                  y: finalPos.y + 0.15,
                  z: finalPos.z
                }, true);
              }
            }, 50);
          }
        }
      }, 100);
      
      // Reset contador se passou muito tempo
      if (stuckAttempts.current > 5) {
        stuckAttempts.current = 0;
      }
      
      return true;
    } else {
      // Reset contador quando não está travado
      stuckAttempts.current = 0;
    }
    
    return false;
  };

  // 🔥 FUNÇÃO MELHORADA PARA AJUSTAR AO CHÃO
  const adjustToGround = (force = false) => {
    if (!rigidBodyRef.current || !worldGroupRef?.current || isAdjusting) return;
    setIsAdjusting(true);

    const currentPos = rigidBodyRef.current.translation();
    const raycaster = new Raycaster();
    
    const GROUND_OFFSET = 0.02;
    const SNAP_THRESHOLD = 0.15;

    const findGround = () => {
      const origin = new Vector3(currentPos.x, currentPos.y + 0.1, currentPos.z);
      const direction = new Vector3(0, -1, 0);
      raycaster.set(origin, direction);

      const allObjects = [];
      const collectObjects = (obj) => {
        if (obj.isMesh && obj.visible) allObjects.push(obj);
        if (obj.children) obj.children.forEach(child => collectObjects(child));
      };

      if (worldGroupRef.current) collectObjects(worldGroupRef.current);

      let closestHit = null;
      let closestDistance = Infinity;

      for (const obj of allObjects) {
        const intersects = raycaster.intersectObject(obj, true);
        if (intersects.length > 0) {
          const hit = intersects[0];
          if (hit.distance < closestDistance) {
            closestDistance = hit.distance;
            closestHit = hit;
          }
        }
      }

      return closestHit;
    };

    const groundHit = findGround();

    if (groundHit) {
      const targetY = groundHit.point.y + GROUND_OFFSET;
      const currentY = currentPos.y;
      const deltaY = targetY - currentY;
      const deltaAbs = Math.abs(deltaY);

      if (deltaAbs > 0.001) {
        if (deltaAbs > SNAP_THRESHOLD || force) {
          rigidBodyRef.current.setTranslation(
            { x: currentPos.x, y: targetY, z: currentPos.z },
            true
          );
          console.log(`🔄 Teleportado para Y: ${targetY.toFixed(3)} (delta: ${deltaY.toFixed(3)})`);
        } else {
          const smoothY = currentY + deltaY * 0.5;
          rigidBodyRef.current.setTranslation(
            { x: currentPos.x, y: smoothY, z: currentPos.z },
            true
          );
        }
      }
    } else {
      console.warn('⚠️ Nenhum chão encontrado abaixo do personagem');
      const newY = currentPos.y - 0.5;
      if (newY > -10) {
        rigidBodyRef.current.setTranslation(
          { x: currentPos.x, y: newY, z: currentPos.z },
          true
        );
        setTimeout(() => {
          setIsAdjusting(false);
          adjustToGround(true);
        }, 100);
        return;
      }
    }

    setIsAdjusting(false);
  };

  // 🔥 DETECTA E RESOLVE TRAVAMENTO A CADA FRAME
  useFrame(() => {
    if (!rigidBodyRef.current || isAdjusting) return;
    
    // Detecta e resolve travamento em quinas
    detectAndResolveStuck();
    
    const pos = rigidBodyRef.current.translation();
    
    // Ajusta ao chão se estiver flutuando
    if (pos.y > 2) {
      adjustToGround(true);
    }
    
    if (pos.y < -10) {
      adjustToGround(true);
    }
  });

  // 🔥 CHAMADA INICIAL E QUANDO A CENA MUDA
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rigidBodyRef.current && worldGroupRef?.current) {
        adjustToGround(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentScene, worldGroupRef]);

  // 🔥 VERIFICAÇÃO PERIÓDICA (a cada 2 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      if (rigidBodyRef.current && !isAdjusting && !loadingAvatar) {
        const pos = rigidBodyRef.current.translation();
        if (pos.y > 1) {
          adjustToGround(true);
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
    
    // 🔥 MELHORIA: Verifica se está travado antes de aplicar movimento
    const horizontalSpeed = Math.sqrt((currentVel.x * currentVel.x) + (currentVel.z * currentVel.z));
    const isMovingInput = dx !== 0 || dz !== 0;
    
    // Se está com input mas velocidade muito baixa, pode estar travado
    // Aplica um pequeno impulso extra para desengatar
    let finalVelX = moveVector.x * speed;
    let finalVelZ = moveVector.z * speed;
    
    if (isMovingInput && horizontalSpeed < 0.1) {
      // Dá um "empurrão" extra para desengatar
      const boostMultiplier = 1.5;
      finalVelX *= boostMultiplier;
      finalVelZ *= boostMultiplier;
    }
    
    rigidBodyRef.current.setLinvel(
      { x: finalVelX, y: currentVel.y, z: finalVelZ },
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
      // 🔥 MANTÉM ROTAÇÃO BLOQUEADA (sem tombamento)
      enabledRotations={[false, false, false]}
      friction={0.3}
      restitution={0.0}
    >
      <CapsuleCollider 
        args={[0.3, 0.4]}
        // 🔥 POSIÇÃO DO COLLIDER AJUSTADA
        position={[0, 0.05, 0]}
      />
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