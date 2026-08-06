import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { Box, Sphere, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';

const MOUNT_TYPES = {
  horse: { 
    name:'Cavalo', 
    bodyColor:'#8B6914', 
    headColor:'#A0782C', 
    maneColor:'#4a3520', 
    glowColor:'#ffaa44', 
    size:0.8, 
    speed:5.0, 
    jumpForce:4.0, 
    playerOffset:0.7,
    glb:'/models/mount/horse.glb',
    boneName: 'mixamorig:Spine1',
    // 🔥 OFFSETS PARA POSICIONAR O PLAYER NA SELA
    offsetX: 0.3,
    offsetY: -0.3,
    offsetZ: -0.03,
    // 🔥 OFFSET DA MALHA DO CAVALO (para não flutuar)
    meshOffsetY: -0.8,
  },
  wolf: { 
    name:'Lobo',   
    bodyColor:'#4a5568', 
    headColor:'#718096', 
    maneColor:'#2d3748', 
    glowColor:'#63b3ed', 
    size:0.75, 
    speed:6.5, 
    jumpForce:5.5, 
    playerOffset:0.6,
    glb:null,
    boneName: null,
    offsetX: 0.0,
    offsetY: 0.0,
    offsetZ: 0.0,
    meshOffsetY: 0,
  },
tiger: { 
    name:'Tigre',  
    bodyColor:'#dd6b20', 
    headColor:'#ed8936', 
    maneColor:'#c05621', 
    glowColor:'#f6ad55', 
    size:0.85, 
    speed:5.8, 
    jumpForce:6.5, 
    playerOffset:0.8,
    glb:null,
    boneName: null,
    offsetX: 0.0,
    offsetY: 0.0,
    offsetZ: 0.0,
    meshOffsetY: 0,
  },
  // 🔥 PLANADOR (aberto segurando espaço no ar — não é uma montaria física)
  glider: {
    name:'Planador',
    bodyColor:'#2ab7ca',
    headColor:'#7fd8be',
    maneColor:'#ffd166',
    glowColor:'#ffd166',
    size:0.6,
    speed:6.0,
    jumpForce:1.0,
    playerOffset:0.0,
    glb:null,
    boneName: null,
    offsetX: 0.0,
    offsetY: 0.0,
    offsetZ: 0.0,
    meshOffsetY: 0,
  },
};

const MOUNT_BASE_HEIGHT = 0.35;

function MountCubes({ config }) {
  const MS = config.size;
  return (
    <>
      <Box args={[MS*1.2, MS*0.7, MS*1.6]} castShadow receiveShadow>
        <meshStandardMaterial color={config.bodyColor} roughness={0.7} metalness={0.1} />
      </Box>
      <Box args={[MS*0.6, MS*0.5, MS*0.5]} position={[0, MS*0.3, MS*0.9]} castShadow receiveShadow>
        <meshStandardMaterial color={config.headColor} roughness={0.6} metalness={0.1} />
      </Box>
      <mesh position={[-0.15, MS*0.65, MS*0.95]}><coneGeometry args={[0.05,0.12,6]} /><meshStandardMaterial color={config.maneColor} /></mesh>
      <mesh position={[0.15, MS*0.65, MS*0.95]}><coneGeometry args={[0.05,0.12,6]} /><meshStandardMaterial color={config.maneColor} /></mesh>
      <Sphere args={[0.06,8,8]} position={[-0.15, MS*0.38, MS*1.12]}><meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.3} /></Sphere>
      <Sphere args={[0.06,8,8]} position={[0.15, MS*0.38, MS*1.12]}><meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.3} /></Sphere>
      <Sphere args={[0.03,6,6]} position={[-0.15, MS*0.36, MS*1.15]}><meshStandardMaterial color="black" /></Sphere>
      <Sphere args={[0.03,6,6]} position={[0.15, MS*0.36, MS*1.15]}><meshStandardMaterial color="black" /></Sphere>
      <Box args={[MS*0.9, MS*0.12, MS*0.7]} position={[0, MS*0.1, -0.1]}><meshStandardMaterial color="#C0392B" roughness={0.8} metalness={0.0} /></Box>
      <Box args={[0.05, MS*0.3, MS*0.2]} position={[0, MS*0.5, MS*0.7]}><meshStandardMaterial color={config.maneColor} roughness={0.9} /></Box>
      <Box args={[0.04, MS*0.25, MS*0.18]} position={[-0.08, MS*0.45, MS*0.7]}><meshStandardMaterial color={config.maneColor} roughness={0.9} /></Box>
      <Box args={[0.04, MS*0.25, MS*0.18]} position={[0.08, MS*0.45, MS*0.7]}><meshStandardMaterial color={config.maneColor} roughness={0.9} /></Box>
      <Box args={[0.04, MS*0.3, MS*0.15]} position={[0, MS*0.15, -MS*0.9]}><meshStandardMaterial color={config.maneColor} roughness={0.9} /></Box>
      <Box args={[MS*0.1, MS*0.4, MS*0.1]} position={[-MS*0.35, -MS*0.35, MS*0.5]}><meshStandardMaterial color={config.bodyColor} roughness={0.8} /></Box>
      <Box args={[MS*0.1, MS*0.4, MS*0.1]} position={[MS*0.35, -MS*0.35, MS*0.5]}><meshStandardMaterial color={config.bodyColor} roughness={0.8} /></Box>
      <Box args={[MS*0.1, MS*0.4, MS*0.1]} position={[-MS*0.35, -MS*0.35, -MS*0.5]}><meshStandardMaterial color={config.bodyColor} roughness={0.8} /></Box>
      <Box args={[MS*0.1, MS*0.4, MS*0.1]} position={[MS*0.35, -MS*0.35, -MS*0.5]}><meshStandardMaterial color={config.bodyColor} roughness={0.8} /></Box>
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -MS*0.45, 0]}>
        <ringGeometry args={[MS*0.6, MS*0.85, 24]} />
        <meshStandardMaterial color={config.glowColor} emissive={config.glowColor} emissiveIntensity={0.3} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

// 🔥 COMPONENTE DO CAVALO GLB COM BONE ATTACHMENT
function MountGLB({ glbPath, config, onBoneFound }) {
  const { scene, animations } = useGLTF(glbPath);
  const groupRef = useRef();
  const { actions, names } = useAnimations(animations, groupRef);
  
  const currentAnimIndex = useRef(-1);
  const isWaitingForStop = useRef(false);
  const stopTimeoutRef = useRef(null);
  
  const ANIM_INDEX = {
    IDLE: 3,
    STOP: 4,
    RUN: 5,
  };
  
  // 🔥 PROCURA O OSSO DA COLUNA
  useEffect(() => {
    if (!scene) return;
    
    let foundBone = null;
    const bonePriority = ['mixamorig:Spine1', 'Spine1', 'mixamorig:Spine', 'Spine', 'mixamorig:Chest', 'Chest', 'mixamorig:Spine2', 'Spine2'];
    
    for (const boneName of bonePriority) {
      scene.traverse((child) => {
        if (child.isBone && child.name === boneName && !foundBone) {
          foundBone = child;
          console.log(`🦴 Osso encontrado: "${child.name}"`);
        }
      });
      if (foundBone) break;
    }
    
    if (!foundBone) {
      scene.traverse((child) => {
        if (child.isBone) {
          const nameLower = child.name.toLowerCase();
          if (nameLower.includes('spine') && !foundBone) {
            foundBone = child;
            console.log(`🦴 Osso da coluna encontrado: "${child.name}"`);
          }
        }
      });
    }
    
    if (!foundBone) {
      scene.traverse((child) => {
        if (child.isBone) {
          const nameLower = child.name.toLowerCase();
          if ((nameLower.includes('hip') || nameLower.includes('pelvis')) && !foundBone) {
            foundBone = child;
            console.log(`🦴 Osso do quadril encontrado: "${child.name}"`);
          }
        }
      });
    }
    
    if (!foundBone) {
      scene.traverse((child) => {
        if (child.isBone && !foundBone) {
          foundBone = child;
          console.log(`🦴 Primeiro osso encontrado: "${child.name}"`);
        }
      });
    }
    
    if (foundBone) {
      onBoneFound(foundBone);
    } else {
      console.warn('⚠️ Nenhum osso encontrado no modelo!');
    }
    
    // Força update das texturas
    scene.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat.map) mat.map.needsUpdate = true;
              mat.needsUpdate = true;
            });
          } else {
            if (child.material.map) child.material.map.needsUpdate = true;
            child.material.needsUpdate = true;
          }
        }
      }
    });
    
  }, [scene, onBoneFound]);
  
  // 🔥 TOCA ANIMAÇÃO POR ÍNDICE
  const playAnimationByIndex = (index) => {
    if (!actions || Object.keys(actions).length === 0) return;
    if (index < 0 || index >= names.length) return;
    
    const animName = names[index];
    if (animName && actions[animName]) {
      if (currentAnimIndex.current === index) return;
      
      Object.values(actions).forEach(action => {
        action.stop();
      });
      actions[animName].reset().play();
      currentAnimIndex.current = index;
      
      let label = '';
      if (index === ANIM_INDEX.IDLE) label = '🟢 PARADO';
      else if (index === ANIM_INDEX.STOP) label = '🟡 FREANDO';
      else if (index === ANIM_INDEX.RUN) label = '🏃 ANDANDO';
      console.log(`🎬 ${label}: "${animName}" (índice ${index + 1})`);
    }
  };
  
  // 🔥 MOSTRA ANIMAÇÕES DISPONÍVEIS
  useEffect(() => {
    console.log('🐴 Animações disponíveis:');
    names.forEach((name, i) => {
      let label = '';
      if (i === ANIM_INDEX.IDLE) label = ' ← PARADO';
      else if (i === ANIM_INDEX.STOP) label = ' ← FREANDO';
      else if (i === ANIM_INDEX.RUN) label = ' ← ANDANDO';
      console.log(`  ${i+1}: "${name}"${label}`);
    });
    console.log('📌 4 = parado, 5 = freando, 6 = andando');
  }, [names]);
  
  // 🔥 GERENCIA ANIMAÇÕES
  const mount = useGameStore((s) => s.mount);
  const mountMoveDir = useGameStore((s) => s.mountMoveDir);
  const isActive = !!mount?.isActive;
  
  useFrame(() => {
    if (!isActive || !actions || Object.keys(actions).length === 0) return;
    
    const dir = mountMoveDir || { x: 0, z: 0 };
    const isMoving = Math.abs(dir.x) > 0.01 || Math.abs(dir.z) > 0.01;
    
    if (isMoving) {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      isWaitingForStop.current = false;
      playAnimationByIndex(ANIM_INDEX.RUN);
      return;
    }
    
    if (!isWaitingForStop.current && currentAnimIndex.current === ANIM_INDEX.RUN) {
      isWaitingForStop.current = true;
      playAnimationByIndex(ANIM_INDEX.STOP);
      
      stopTimeoutRef.current = setTimeout(() => {
        playAnimationByIndex(ANIM_INDEX.IDLE);
        isWaitingForStop.current = false;
        stopTimeoutRef.current = null;
      }, 800);
      return;
    }
    
    if (!isWaitingForStop.current) {
      playAnimationByIndex(ANIM_INDEX.IDLE);
    }
  });
  
  // Limpa timeout ao desmontar
  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
    };
  }, []);
  
  // 🔥 APLICA O OFFSET DA MALHA PARA O CAVALO FICAR NO CHÃO
  const meshOffsetY = config.meshOffsetY || 0;
  
  return (
    <group ref={groupRef} position={[0, meshOffsetY, 0]}>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} rotation={[0, Math.PI/2, 0]} />
    </group>
  );
}

export function Mount() {
  const { camera } = useThree();
  const rigidBodyRef = useRef(null);
  const mountGroupRef = useRef(null);
  const spineBoneRef = useRef(null);

  const mount = useGameStore((s) => s.mount);
  const mountMoveDir = useGameStore((s) => s.mountMoveDir);
  const setMountRotation = useGameStore((s) => s.setMountRotation);
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition);
  const playerRigidBody = useGameStore((s) => s.playerRigidBody);

  const isActive = !!mount?.isActive;
  const typeKey = mount?.type || 'horse';
  const config = MOUNT_TYPES[typeKey] || MOUNT_TYPES.horse;
  const speed = config.speed;
  const playerOffsetY = config.playerOffset;
  const useGLB = !!(config.glb);

  const jumpVel = useRef(0);
  const jumping = useRef(false);
  const targetRot = useRef(0);
  const currentRot = useRef(0);
  const firstFrame = useRef(true);
  const isGrounded = useRef(false);
  const wasActiveRef = useRef(false);

  // 🔥 CALLBACK QUANDO O OSSO É ENCONTRADO
  const handleBoneFound = (bone) => {
    spineBoneRef.current = bone;
    console.log('✅ Osso da coluna fixado para o player!');
  };

  // Espaço - pulo
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && isActive) {
        e.preventDefault();
        if (!jumping.current && isGrounded.current) {
          jumpVel.current = config.jumpForce;
          jumping.current = true;
          isGrounded.current = false;
        }
      }
    };
    
    const onMountJump = () => {
      if (isActive && !jumping.current && isGrounded.current) {
        jumpVel.current = config.jumpForce;
        jumping.current = true;
        isGrounded.current = false;
      }
    };
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mountJump', onMountJump);
    
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mountJump', onMountJump);
    };
  }, [isActive, config.jumpForce]);

  // 🔥 RESETA POSIÇÃO DO PLAYER AO DESMONTAR (VOLTA PARA O CHÃO SEM OFFSET)
  useEffect(() => {
    if (!isActive && wasActiveRef.current) {
      if (playerRigidBody) {
        try {
          const mountPos = rigidBodyRef.current?.translation();
          if (mountPos) {
            // 🔥 POSIÇÃO NORMAL DO PLAYER NO CHÃO (SEM OFFSET DA MONTARIA)
            playerRigidBody.setTranslation(
              { x: mountPos.x + 0.5, y: mountPos.y + 1.5, z: mountPos.z },
              true
            );
            playerRigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
            setPlayerPosition({ x: mountPos.x + 0.5, y: mountPos.y + 0.5, z: mountPos.z });
          }
        } catch (e) {
          console.warn('Erro ao resetar posição do player:', e);
        }
      }
      spineBoneRef.current = null;
    }
    
    wasActiveRef.current = isActive;
    
    if (!isActive) {
      jumping.current = false;
      jumpVel.current = 0;
      isGrounded.current = false;
    }
  }, [isActive, playerRigidBody, setPlayerPosition]);

  useFrame(({ camera }) => {
    if (!rigidBodyRef.current) return;

    if (!isActive) {
      if (mountGroupRef.current) {
        mountGroupRef.current.visible = false;
      }
      return;
    }

    if (mountGroupRef.current) {
      mountGroupRef.current.visible = true;
    }

    // Posição inicial
    if (firstFrame.current) {
      firstFrame.current = false;
      const pp = useGameStore.getState().playerPosition;
      if (pp) {
        const sx = pp.x, sy = Math.max(pp.y, 0) + 0.5, sz = pp.z;
        rigidBodyRef.current.setTranslation({ x: sx, y: sy, z: sz }, true);
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      return;
    }

    // Verifica se está no chão via velocidade Y
    const vel = rigidBodyRef.current.linvel();
    if (Math.abs(vel.y) < 0.1 && !jumping.current) {
      isGrounded.current = true;
    }

    // Direção do movimento
    const dir = mountMoveDir || { x: 0, z: 0 };
    const { x: dx, z: dz } = dir;
    const moving = dx !== 0 || dz !== 0;

    // Direção da câmera
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    const right = new THREE.Vector3(-camDir.z, 0, camDir.x);

    const moveVec = new THREE.Vector3();
    moveVec.addScaledVector(camDir, dz);
    moveVec.addScaledVector(right, dx);
    if (moveVec.length() > 0) moveVec.normalize();

    // Aplica velocidade
    if (moving) {
      const targetVelX = moveVec.x * speed;
      const targetVelZ = moveVec.z * speed;
      
      const currentVel = rigidBodyRef.current.linvel();
      const smoothFactor = 8;
      const newVelX = currentVel.x + (targetVelX - currentVel.x) * Math.min(1, smoothFactor * 0.016);
      const newVelZ = currentVel.z + (targetVelZ - currentVel.z) * Math.min(1, smoothFactor * 0.016);
      
      rigidBodyRef.current.setLinvel(
        { x: newVelX, y: currentVel.y, z: newVelZ },
        true
      );
    } else {
      const currentVel = rigidBodyRef.current.linvel();
      const brakeFactor = 10;
      const newVelX = currentVel.x * (1 - Math.min(1, brakeFactor * 0.016));
      const newVelZ = currentVel.z * (1 - Math.min(1, brakeFactor * 0.016));
      
      rigidBodyRef.current.setLinvel(
        { x: newVelX, y: currentVel.y, z: newVelZ },
        true
      );
    }

    // Pulo
    if (jumping.current) {
      const currentVel = rigidBodyRef.current.linvel();
      rigidBodyRef.current.setLinvel(
        { x: currentVel.x, y: jumpVel.current, z: currentVel.z },
        true
      );
      jumping.current = false;
    }

    // Rotação (heading)
    if (moving && moveVec.length() > 0.1) {
      targetRot.current = Math.atan2(moveVec.x, moveVec.z);
    }
    
    let diff = targetRot.current - currentRot.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentRot.current += diff * Math.min(1, 8 * 0.016);

    // Visual - rotação
    if (mountGroupRef.current) {
      mountGroupRef.current.rotation.y = currentRot.current;
      setMountRotation(currentRot.current);
    }

    // 🔥 SINCRONIZA PLAYER COM O OSSO DA COLUNA - SEM DELAY
    if (isActive && playerRigidBody) {
      let targetX, targetY, targetZ, targetRotY;
      
      if (spineBoneRef.current && useGLB) {
        // Pega a posição mundial do osso
        const boneWorldPos = new THREE.Vector3();
        spineBoneRef.current.getWorldPosition(boneWorldPos);
        
        // Pega a rotação mundial do osso
        const boneWorldQuat = new THREE.Quaternion();
        spineBoneRef.current.getWorldQuaternion(boneWorldQuat);
        const boneEuler = new THREE.Euler().setFromQuaternion(boneWorldQuat);
        
        // 🔥 CRIA O VETOR DE OFFSET LOCAL (X, Y, Z) - VALORES QUE VOCÊ PEDIU
        const localOffset = new THREE.Vector3(
          config.offsetX || 0.3,
          config.offsetY || -0.5,
          config.offsetZ || -0.05
        );
        
        // 🔥 TRANSFORMA O OFFSET LOCAL PARA MUNDIAL
        const worldOffset = localOffset.clone().applyQuaternion(boneWorldQuat);
        
        targetX = boneWorldPos.x + worldOffset.x;
        targetY = boneWorldPos.y + worldOffset.y;
        targetZ = boneWorldPos.z + worldOffset.z;
        targetRotY = boneEuler.y;
      } else {
        const mp = rigidBodyRef.current.translation();
        targetX = mp.x;
        targetY = mp.y + playerOffsetY;
        targetZ = mp.z;
        targetRotY = currentRot.current;
      }
      
      // 🔥 APLICA DIRETAMENTE SEM VERIFICAR (SEM DELAY)
      try {
        playerRigidBody.setTranslation({ x: targetX, y: targetY, z: targetZ }, true);
        playerRigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      } catch (e) {}
      
      setPlayerPosition({ x: targetX, y: targetY, z: targetZ });
    }
  });

  return (
<RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      mass={10}
      position={[0, 500, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={0.5}
      angularDamping={1.0}
      lockRotations={true}
      enabled={isActive}
    >
      <CapsuleCollider args={[0.3, 0.6]} />
      <group ref={mountGroupRef} visible={isActive}>
        {useGLB ? (
          <MountGLB 
            glbPath={config.glb} 
            config={config} 
            onBoneFound={handleBoneFound}
          />
        ) : (
          <MountCubes config={config} />
        )}
      </group>
    </RigidBody>
  );
}