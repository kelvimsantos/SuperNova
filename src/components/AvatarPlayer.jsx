// src/components/AvatarPlayer.jsx
import { useRef, useEffect, useState, useMemo } from 'react';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3, Raycaster } from 'three';
import useGameStore from '../hooks/useGameStore';

const AVATAR_MODEL_PATH = '/models/avatar/body.glb';
const HAIR_BASE_PATH = '/models/avatar/hair/hair-';

// 🔥 MESMA ESCALA DA REDE SOCIAL
const AVATAR_SCALE = 0.008;

export const AvatarPlayer = ({ userId, avatarConfig, loadingAvatar }) => {
  const rigidBodyRef = useRef();
  const visualRef = useRef();
  const bodyModelRef = useRef(null);
  const hairModelRef = useRef(null);
  const moveDir = useRef({ x: 0, z: 0 });
  const [isGrounded, setIsGrounded] = useState(true);
  
  const setPlayerRigidBody = useGameStore((state) => state.setPlayerRigidBody);
  const currentAnim = useRef('idle');
  const isNight = useGameStore((state) => state.isNight);
  const currentScene = useGameStore((state) => state.currentScene);
  const worldGroupRef = useGameStore((state) => state.worldGroupRef);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const playerHealth = useGameStore((state) => state.playerHealth);
  const isDead = playerHealth <= 0;

  // 🔥 CARREGA O MODELO
  const { scene: bodyScene, animations } = useGLTF(AVATAR_MODEL_PATH);
  
  const hairIndex = avatarConfig?.hairIndex ?? -1;
  const hairPath = hairIndex >= 0 ? `${HAIR_BASE_PATH}${String(hairIndex + 1).padStart(2, '0')}.glb` : null;
  const { scene: hairScene } = useGLTF(hairPath || '');
  
  const { actions } = useAnimations(animations, bodyModelRef);

  // 🔥 MAPEAMENTO CORRETO DAS ANIMAÇÕES (NOMES EXATOS DO MODELO)
  const animationMap = useMemo(() => ({
    idle: 'idle2',        // ← NOME EXATO do seu modelo
    run: 'Run',           // ← NOME EXATO
    fall: 'Fall',         // ← NOME EXATO
    jump: 'Jump',         // ← NOME EXATO
    hit: 'Hitado',        // ← NOME EXATO
    attack1: 'Punching1', // ← NOME EXATO
    attack2: 'Punching2', // ← NOME EXATO
    aim: 'Mira-arco'      // ← NOME EXATO
  }), []);

  // 🔥 DEBUG: Lista animações disponíveis
  useEffect(() => {
    if (animations && animations.length > 0) {
      console.log('🎬 Animações disponíveis no avatar:');
      animations.forEach((anim, i) => {
        console.log(`  ${i+1}. "${anim.name}" (${anim.duration.toFixed(2)}s)`);
      });
      console.log('📌 Mapeamento:', animationMap);
    }
  }, [animations, animationMap]);

  // 🔥 APLICA COR DA PELE
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

  // 🔥 APLICA COR DO CABELO
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

  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.currentMoveDir = moveDir;
      setPlayerRigidBody(rigidBodyRef.current);
    }
    return () => setPlayerRigidBody(null);
  }, [setPlayerRigidBody]);

  // 🔥 TOCA ANIMAÇÃO (CORRIGIDO)
  const playAnimation = (name) => {
    if (!actions || isDead) {
      console.warn('⚠️ Sem actions ou personagem morto');
      return;
    }
    
    // Mapeia o nome
    const mappedName = animationMap[name] || name;
    console.log(`🎯 Tentando tocar: "${name}" → mapeado para: "${mappedName}"`);
    
    // Tenta encontrar a animação
    let action = actions[mappedName];
    
    // Se não encontrou, tenta busca case-insensitive
    if (!action) {
      const key = Object.keys(actions).find(key => 
        key.toLowerCase() === mappedName.toLowerCase()
      );
      if (key) action = actions[key];
    }
    
    // Se ainda não encontrou, tenta partial match
    if (!action) {
      const key = Object.keys(actions).find(key => 
        key.toLowerCase().includes(mappedName.toLowerCase())
      );
      if (key) action = actions[key];
    }
    
    if (!action) {
      console.warn(`⚠️ Animação "${mappedName}" não encontrada!`);
      // Fallback: usa a primeira animação disponível
      const firstAction = Object.values(actions)[0];
      if (firstAction && currentAnim.current !== firstAction.name) {
        console.log(`🔄 Fallback para: "${firstAction.name}"`);
        Object.values(actions).forEach(a => a.stop());
        firstAction.reset().play();
        currentAnim.current = firstAction.name;
      }
      return;
    }
    
    if (currentAnim.current === action.name) {
      return; // Já está tocando
    }
    
    console.log(`▶️ Trocando para: "${action.name}"`);
    Object.values(actions).forEach(a => a.stop());
    action.reset().play();
    currentAnim.current = action.name;
  };

  // 🔥 FUNÇÃO PARA ENCONTRAR O CHÃO
  const findGroundAndAdjust = () => {
    if (!rigidBodyRef.current || !worldGroupRef?.current || isAdjusting) return;

    setIsAdjusting(true);
    
    const currentPos = rigidBodyRef.current.translation();
    const raycaster = new Raycaster();
    
    const tryFindGround = (startY) => {
      return new Promise((resolve) => {
        let foundGround = false;
        let groundY = null;
        
        for (let yOffset = 0; yOffset <= 100; yOffset += 5) {
          const origin = new Vector3(currentPos.x, startY + yOffset, currentPos.z);
          const direction = new Vector3(0, -1, 0);
          raycaster.set(origin, direction);
          
          const allObjects = [];
          const collectObjects = (obj) => {
            if (obj.isMesh && obj.visible) {
              allObjects.push(obj);
            }
            if (obj.children) {
              obj.children.forEach(child => collectObjects(child));
            }
          };
          
          if (worldGroupRef.current) {
            collectObjects(worldGroupRef.current);
          }
          
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
    
    tryFindGround(currentPos.y).then(({ foundGround, groundY }) => {
      if (foundGround && groundY !== null) {
        const newY = groundY + 1.5;
        rigidBodyRef.current.setTranslation({ x: currentPos.x, y: newY, z: currentPos.z }, true);
      } else {
        const newY = currentPos.y + 20;
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (rigidBodyRef.current && worldGroupRef?.current) {
        findGroundAndAdjust();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentScene, worldGroupRef]);

  useFrame(() => {
    if (!rigidBodyRef.current || isAdjusting) return;
    
    const pos = rigidBodyRef.current.translation();
    
    if (pos.y < -10) {
      findGroundAndAdjust();
    }
  });

  // 🔥 LOOP PRINCIPAL
  useFrame(({ camera }) => {
    if (!rigidBodyRef.current || loadingAvatar || isDead) return;

    const position = rigidBodyRef.current.translation();
    setPlayerPosition({ x: position.x, y: position.y, z: position.z });

    const { x: dx, z: dz } = moveDir.current;
    const currentVel = rigidBodyRef.current.linvel();

    const grounded = Math.abs(currentVel.y) < 0.1;
    setIsGrounded(grounded);

    const isMoving = dx !== 0 || dz !== 0;
    
    // 🔥 LOG PARA DEBUG (só algumas vezes)
    if (Math.random() < 0.01) {
      console.log(`🎮 Movendo: ${isMoving}, Grounded: ${grounded}, Anim atual: ${currentAnim.current}`);
    }
    
    if (!isMoving) {
      if (grounded) {
        playAnimation('idle');
      } else {
        playAnimation('fall');
      }
    } else {
      playAnimation('run');
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

  if (loadingAvatar) {
    return (
      <RigidBody ref={rigidBodyRef} mass={1} position={[0, 50, 0]}>
        <CapsuleCollider args={[0.3, 0.4]} />
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="gray" transparent opacity={0.5} />
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
        
        {/* 🔥 MESMA ESCALA DA REDE SOCIAL */}
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