// src/components/AvatarPlayer.jsx
import { useRef, useEffect, useState, useMemo } from 'react';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3, Raycaster } from 'three';
import useGameStore from '../hooks/useGameStore';
import { useAvatarLoader } from '../hooks/useAvatarLoader';

// 🔥 CAMINHO DO MODELO COM ANIMAÇÕES
const AVATAR_MODEL_PATH = '/models/avatar/body.glb';
const HAIR_BASE_PATH = '/models/avatar/hair/hair-';

export const AvatarPlayer = ({ userId }) => {
  const rigidBodyRef = useRef();
  const visualRef = useRef();
  const bodyModelRef = useRef(null);
  const hairModelRef = useRef(null);
  const moveDir = useRef({ x: 0, z: 0 });
  const [isGrounded, setIsGrounded] = useState(true);
  
  // 🔥 Carrega a configuração do avatar da rede
  const { avatarConfig, loading, error } = useAvatarLoader(userId);
  
  const setPlayerRigidBody = useGameStore((state) => state.setPlayerRigidBody);
  const currentAnim = useRef('idle');
  const isNight = useGameStore((state) => state.isNight);
  const currentScene = useGameStore((state) => state.currentScene);
  const worldGroupRef = useGameStore((state) => state.worldGroupRef);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const playerHealth = useGameStore((state) => state.playerHealth);
  const isDead = playerHealth <= 0;

  // 🔥 Carrega o modelo COM TODAS AS ANIMAÇÕES
  const { scene: bodyScene, animations } = useGLTF(AVATAR_MODEL_PATH);
  
  // 🔥 Carrega o modelo do cabelo (se houver hairIndex)
  const hairIndex = avatarConfig?.hairIndex ?? -1;
  const hairPath = hairIndex >= 0 ? `${HAIR_BASE_PATH}${String(hairIndex + 1).padStart(2, '0')}.glb` : null;
  const { scene: hairScene } = useGLTF(hairPath || '');
  
  // 🔥 CONFIGURA ANIMAÇÕES (usa o mixer padrão do drei)
  const { actions } = useAnimations(animations, bodyModelRef);

  // 🔥 MAPEIA AS ANIMAÇÕES DO MODELO
  // As animações disponíveis: idle1, idle2, Run, Fall, Hitado, Jump, Mira-arco, Punching1, Punching2
  const animationMap = useMemo(() => ({
    idle: 'idle2',      // Usa idle2 como padrão
    run: 'Run',
    fall: 'Fall',
    jump: 'Jump',
    hit: 'Hitado',
    attack1: 'Punching1',
    attack2: 'Punching2',
    aim: 'Mira-arco'
  }), []);

  // 🔥 DEBUG: Lista animações disponíveis
  useEffect(() => {
    if (animations && animations.length > 0) {
      console.log('🎬 Animações disponíveis no avatar:');
      animations.forEach((anim, i) => {
        console.log(`  ${i+1}. ${anim.name} (${anim.duration.toFixed(2)}s)`);
      });
    }
  }, [animations]);

  // 🔥 APLICA COR DA PELE
  useEffect(() => {
    if (!bodyModelRef.current || !avatarConfig) return;
    
    const skinColor = avatarConfig.skinColor || '#f1c27d';
    
    bodyModelRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          if (mat.color) {
            mat.color.set(skinColor);
          }
          // Remove brilho metálico
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
          if (mat.color) {
            mat.color.set(hairColor);
          }
          mat.needsUpdate = true;
        });
      }
    });
  }, [hairModelRef, avatarConfig]);

  // 🔥 REGISTRA O RIGID BODY
  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.currentMoveDir = moveDir;
      setPlayerRigidBody(rigidBodyRef.current);
    }
    return () => setPlayerRigidBody(null);
  }, [setPlayerRigidBody]);

  // 🔥 TOCA ANIMAÇÃO
  const playAnimation = (name) => {
    if (!actions) return;
    if (isDead) {
      // Se estiver morto, não toca animações
      return;
    }
    
    // Mapeia o nome da animação do jogo para o nome no modelo
    const mappedName = animationMap[name] || name;
    
    // Tenta encontrar a animação exata
    let action = actions[mappedName];
    
    // Se não encontrar, tenta achar qualquer animação com nome similar (case insensitive)
    if (!action) {
      const key = Object.keys(actions).find(key => 
        key.toLowerCase().includes(name.toLowerCase())
      );
      if (key) action = actions[key];
    }
    
    if (!action) {
      // Se ainda não encontrou, usa idle2 como fallback
      if (name !== 'idle') {
        const idleAction = actions['idle2'] || Object.values(actions)[0];
        if (idleAction && currentAnim.current !== idleAction.name) {
          Object.values(actions).forEach(a => a.stop());
          idleAction.reset().play();
          currentAnim.current = idleAction.name;
        }
      }
      return;
    }
    
    if (currentAnim.current === action.name) return;
    
    Object.values(actions).forEach(a => a.stop());
    action.reset().play();
    currentAnim.current = action.name;
  };

  // 🔥 FUNÇÃO PARA ENCONTRAR O CHÃO (mesma do Player original)
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

  // 🔥 EXECUTA QUANDO A CENA MUDA
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rigidBodyRef.current && worldGroupRef?.current) {
        findGroundAndAdjust();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentScene, worldGroupRef]);

  // 🔥 VERIFICA SE O PLAYER ESTÁ CAINDO
  useFrame(() => {
    if (!rigidBodyRef.current || isAdjusting) return;
    
    const pos = rigidBodyRef.current.translation();
    
    if (pos.y < -10) {
      findGroundAndAdjust();
    }
  });

  // 🔥 LOOP PRINCIPAL DO PLAYER
  useFrame(({ camera }) => {
    if (!rigidBodyRef.current || loading || isDead) return;

    const position = rigidBodyRef.current.translation();
    setPlayerPosition({ x: position.x, y: position.y, z: position.z });

    const { x: dx, z: dz } = moveDir.current;
    const currentVel = rigidBodyRef.current.linvel();

    const grounded = Math.abs(currentVel.y) < 0.1;
    setIsGrounded(grounded);

    const isMoving = dx !== 0 || dz !== 0;
    if (!isMoving) {
      playAnimation(grounded ? 'idle' : 'fall');
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

  // Se estiver carregando, mostra um placeholder
  if (loading) {
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
        
        <group ref={visualRef} scale={0.25} position={[0, -0.7, 0]}>
          {/* 🔥 CORPO DO AVATAR (COM ANIMAÇÕES) */}
          <primitive object={bodyScene} ref={bodyModelRef} />
          
          {/* 🔥 CABELO DO AVATAR (se houver) */}
          {hairIndex >= 0 && hairScene && (
            <primitive object={hairScene} ref={hairModelRef} />
          )}
        </group>
      </group>
    </RigidBody>
  );
};

// Pré-carrega os modelos
useGLTF.preload(AVATAR_MODEL_PATH);