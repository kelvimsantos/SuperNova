// src/components/AvatarPlayer.jsx
import { useRef, useEffect, useState, useCallback } from 'react';
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

// 🔥 AJUSTE DO CABELO
const HAIR_Y_OFFSET = -10;
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
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const playerHealth = useGameStore((state) => state.playerHealth);
  const isDead = playerHealth <= 0;
  
  // 🔥 ESTADOS PARA CONTROLE
  const [isAdjusting, setIsAdjusting] = useState(false);
  const groundYRef = useRef(0);
  const lastGroundCheck = useRef(0);
  const stuckCounter = useRef(0);

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

  // 🔥 FUNÇÃO PRINCIPAL: ENCONTRA O CHÃO E AJUSTA A POSIÇÃO
  const findGroundAndAdjust = useCallback((force = false) => {
    if (!rigidBodyRef.current || !worldGroupRef?.current || isAdjusting) return;
    
    const currentPos = rigidBodyRef.current.translation();
    const raycaster = new Raycaster();
    
    // 🔥 CONFIGURAÇÕES DO RAYCAST
    const GROUND_OFFSET = 0.01; // Pequeno offset para evitar flutuação
    const MAX_RAY_DISTANCE = 5.0;
    
    // 🔥 DISPARA RAYCAST DE VÁRIAS POSIÇÕES PARA MAIS PRECISÃO
    const checkPositions = [
      { x: 0, z: 0 },           // Centro
      { x: 0.1, z: 0.1 },       // Diagonal
      { x: -0.1, z: 0.1 },      // Diagonal
      { x: 0.1, z: -0.1 },      // Diagonal
      { x: -0.1, z: -0.1 },     // Diagonal
    ];

    let highestGroundY = -Infinity;
    let foundGround = false;

    for (const offset of checkPositions) {
      const origin = new Vector3(
        currentPos.x + offset.x,
        currentPos.y + 0.5,
        currentPos.z + offset.z
      );
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
          const hit = intersects[0];
          if (hit.distance < MAX_RAY_DISTANCE) {
            const groundY = hit.point.y;
            if (groundY > highestGroundY) {
              highestGroundY = groundY;
              foundGround = true;
            }
          }
        }
      }
    }

    if (foundGround) {
      const targetY = highestGroundY + GROUND_OFFSET;
      const currentY = currentPos.y;
      const deltaY = targetY - currentY;
      const deltaAbs = Math.abs(deltaY);

      // 🔥 SÓ AJUSTA SE A DIFERENÇA FOR SIGNIFICATIVA
      if (deltaAbs > 0.005) {
        // 🔥 SE ESTIVER MUITO LONGE OU FORÇADO, TELEPORTA
        if (deltaAbs > 0.2 || force) {
          rigidBodyRef.current.setTranslation(
            { x: currentPos.x, y: targetY, z: currentPos.z },
            true
          );
          console.log(`🔄 Teleportado para Y: ${targetY.toFixed(3)} (delta: ${deltaY.toFixed(3)})`);
        } else {
          // 🔥 AJUSTE SUAVE E CONTÍNUO (EVITA FLUTUAÇÃO)
          const smoothFactor = Math.min(0.3, deltaAbs * 2);
          const smoothY = currentY + (deltaY * smoothFactor);
          rigidBodyRef.current.setTranslation(
            { x: currentPos.x, y: smoothY, z: currentPos.z },
            true
          );
        }
        
        // Atualiza referência do chão
        groundYRef.current = targetY;
      }
    } else {
      // 🔥 SE NÃO ENCONTROU CHÃO, TENTA DESCER GRADUALMENTE
      if (currentPos.y > -10) {
        const newY = currentPos.y - 0.1;
        rigidBodyRef.current.setTranslation(
          { x: currentPos.x, y: newY, z: currentPos.z },
          true
        );
      }
    }
  }, [worldGroupRef, isAdjusting]);

  // 🔥 FUNÇÃO PARA DESENGATAR DE QUINAS
  const handleStuck = useCallback(() => {
    if (!rigidBodyRef.current) return false;
    
    const vel = rigidBodyRef.current.linvel();
    const horizontalSpeed = Math.sqrt((vel.x * vel.x) + (vel.z * vel.z));
    const isMoving = moveDir.current.x !== 0 || moveDir.current.z !== 0;
    
    // 🔥 DETECTA TRAVAMENTO: MOVENDO INPUT MAS SEM VELOCIDADE
    if (isMoving && horizontalSpeed < 0.05) {
      const now = Date.now();
      if (now - lastGroundCheck.current < 100) return false;
      lastGroundCheck.current = now;
      
      stuckCounter.current += 1;
      
      if (stuckCounter.current > 3) {
        console.log('🚧 Travado em quina, aplicando correção...');
        
        // 🔥 ESTRATÉGIA 1: PULO LEVE
        rigidBodyRef.current.setLinvel({ 
          x: vel.x * 0.5, 
          y: 1.0, 
          z: vel.z * 0.5 
        }, true);
        
        // 🔥 ESTRATÉGIA 2: IMPULSO NA DIREÇÃO DO MOVIMENTO
        setTimeout(() => {
          if (rigidBodyRef.current) {
            const moveX = moveDir.current.x;
            const moveZ = moveDir.current.z;
            const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
            
            if (magnitude > 0.1) {
              const normX = moveX / magnitude;
              const normZ = moveZ / magnitude;
              const pushForce = 0.8;
              
              rigidBodyRef.current.setLinvel({
                x: normX * pushForce,
                y: 0.3,
                z: normZ * pushForce
              }, true);
            }
          }
        }, 50);
        
        // Reseta contador
        stuckCounter.current = 0;
        return true;
      }
    } else {
      // Reset contador se não está travado
      stuckCounter.current = 0;
    }
    
    return false;
  }, []);

  // 🔥 VERIFICAÇÃO CONTÍNUA (A CADA FRAME)
  useFrame(() => {
    if (!rigidBodyRef.current || loadingAvatar) return;
    
    // 1. AJUSTA AO CHÃO (VERIFICA FLUTUAÇÃO)
    const pos = rigidBodyRef.current.translation();
    
    // Verifica se está flutuando (acima do chão)
    if (pos.y > 0.5) {
      findGroundAndAdjust(false);
    }
    
    // 2. VERIFICA TRAVAMENTO EM QUINAS
    if (!isAdjusting) {
      handleStuck();
    }
    
    // 3. ATUALIZA GROUNDED STATUS
    const vel = rigidBodyRef.current.linvel();
    const grounded = Math.abs(vel.y) < 0.15 && pos.y < 0.5;
    setIsGrounded(grounded);
  });

  // 🔥 VERIFICAÇÃO PERIÓDICA (A CADA 1 SEGUNDO)
  useEffect(() => {
    const interval = setInterval(() => {
      if (rigidBodyRef.current && !loadingAvatar && !isAdjusting) {
        const pos = rigidBodyRef.current.translation();
        
        // 🔥 VERIFICA FLUTUAÇÃO CONSTANTE
        if (pos.y > 0.3) {
          findGroundAndAdjust(false);
        }
        
        // 🔥 VERIFICA SE CAIU NO VAZIO
        if (pos.y < -5) {
          findGroundAndAdjust(true);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [loadingAvatar, isAdjusting, findGroundAndAdjust]);

  // 🔥 CHAMADA INICIAL E QUANDO A CENA MUDA
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rigidBodyRef.current && worldGroupRef?.current) {
        findGroundAndAdjust(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentScene, worldGroupRef, findGroundAndAdjust]);

  // 🔥 MOVIMENTO PRINCIPAL
  useFrame(({ camera }) => {
    if (!rigidBodyRef.current || loadingAvatar) return;
    
    const position = rigidBodyRef.current.translation();
    setPlayerPosition({ x: position.x, y: position.y, z: position.z });

    const { x: dx, z: dz } = moveDir.current;
    const currentVel = rigidBodyRef.current.linvel();
    const isMoving = dx !== 0 || dz !== 0;
    
    // 🔥 ANIMAÇÕES
    if (!isMoving) {
      playAnimation(isGrounded ? 'idle2' : 'Fall');
    } else {
      playAnimation('Run');
    }

    // 🔥 CALCULA DIREÇÃO DO MOVIMENTO
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

    // 🔥 VELOCIDADE COM BOOST PARA DESENGATAR
    const speed = 2.5;
    let finalVelX = moveVector.x * speed;
    let finalVelZ = moveVector.z * speed;
    
    // 🔥 BOOST EXTRA SE ESTIVER COM VELOCIDADE BAIXA (AJUDA A DESENGATAR)
    const horizontalSpeed = Math.sqrt((currentVel.x * currentVel.x) + (currentVel.z * currentVel.z));
    if (isMoving && horizontalSpeed < 0.1) {
      const boostMultiplier = 1.8;
      finalVelX *= boostMultiplier;
      finalVelZ *= boostMultiplier;
    }
    
    // 🔥 APLICA VELOCIDADE (MANTÉM Y PARA FÍSICA)
    rigidBodyRef.current.setLinvel(
      { x: finalVelX, y: currentVel.y, z: finalVelZ },
      true
    );

    // 🔥 ROTAÇÃO DO VISUAL
    if (visualRef.current && isMoving && moveVector.length() > 0.1) {
      const angle = Math.atan2(moveVector.x, moveVector.z);
      visualRef.current.rotation.y = angle;
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
      position={[0, 30, 0]}
      linearDamping={0.8}
      angularDamping={0.9}
      enabledRotations={[false, false, false]}
      friction={0.2}
      restitution={0.0}
    >
      <CapsuleCollider 
        args={[0.25, 0.35]}
        position={[0, 0, 0]}
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