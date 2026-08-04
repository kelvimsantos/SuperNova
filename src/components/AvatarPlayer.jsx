import { useRef, useEffect, useState, useCallback } from 'react';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3, Raycaster } from 'three';
import useGameStore from '../hooks/useGameStore';
import { EquipmentAttachment } from './equipment/EquipmentAttachment';

const AVATAR_MODEL_PATH = '/models/avatar/body.glb';
const HAIR_BASE_PATH = '/models/avatar/hair/hair-';

const AVATAR_SCALE = 0.006;

const HAIR_POSITIONS = {
  0: { y: -175.1 },
  1: { y: -195.1 },
  2: { y: -195.1 },
  3: { y: -195.1 },
  4: { y: -180.1 },
  5: { y: -195.1 },
  6: { y: -175.1 }
};

const HAIR_Y_OFFSET = -10;
const HAIR_SCALE_FACTOR = 0.8;

const GROUND_OFFSET = 0.01;
const VISUAL_OFFSET_Y = -1.6;
const VISUAL_OFFSET_Z = -0.1;

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
  
  const mount = useGameStore((s) => s.mount);
  const mountRotation = useGameStore((s) => s.mountRotation);
  const isMounted = !!mount?.isActive;

  const equippedItems = useGameStore(state => state.equippedItems);

  const stuckAttempts = useRef(0);
  const lastStuckTime = useRef(0);
  const frameCounter = useRef(0);
  const isFallingRef = useRef(false);
  const wasMountedRef = useRef(false);

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

  // 🔥 REMOVE O CUBO DO GLB
  useEffect(() => {
    if (!bodyScene) return;
    
    const toRemove = [];
    bodyScene.traverse((child) => {
      if (child.isMesh && child.geometry?.type === 'BoxGeometry') {
        const params = child.geometry.parameters || {};
        if (params.width < 0.5 && params.height < 0.5 && params.depth < 0.5) {
          console.log(`🗑️ Removendo cubo do GLB: "${child.name || 'sem nome'}"`);
          toRemove.push(child);
        }
      }
    });
    
    toRemove.forEach(child => {
      if (child.parent) {
        child.parent.remove(child);
      }
    });
    
    if (toRemove.length > 0) {
      console.log(`✅ Removidos ${toRemove.length} cubos do modelo GLB`);
    }
  }, [bodyScene]);

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

  useEffect(() => {
    if (!rigidBodyRef.current) return;
    rigidBodyRef.current.setEnabled(!isMounted);
    if (isMounted) {
      const mountPos = useGameStore.getState().playerPosition;
      if (mountPos) {
        rigidBodyRef.current.setTranslation(
          { x: mountPos.x, y: mountPos.y, z: mountPos.z },
          true
        );
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }, [isMounted]);

  const findGroundY = useCallback((x, z) => {
    if (!worldGroupRef?.current) return null;
    
    const raycaster = new Raycaster();
    const origin = new Vector3(x, 100, z);
    const direction = new Vector3(0, -1, 0);
    raycaster.set(origin, direction);
    raycaster.far = 200;

    const allObjects = [];
    const collectObjects = (obj) => {
      if (obj.isMesh && obj.visible) allObjects.push(obj);
      if (obj.children) obj.children.forEach(child => collectObjects(child));
    };

    if (worldGroupRef.current) collectObjects(worldGroupRef.current);

    let closestHit = null;
    let closestDist = Infinity;

    for (const obj of allObjects) {
      const intersects = raycaster.intersectObject(obj, true);
      if (intersects.length > 0 && intersects[0].distance < closestDist) {
        closestDist = intersects[0].distance;
        closestHit = intersects[0];
      }
    }

    if (closestHit) {
      return closestHit.point.y;
    }
    return null;
  }, [worldGroupRef]);

  const forceSnapToGround = useCallback(() => {
    if (!rigidBodyRef.current || isMounted) return;
    
    const currentPos = rigidBodyRef.current.translation();
    const groundY = findGroundY(currentPos.x, currentPos.z);
    
    if (groundY !== null) {
      const targetY = groundY + GROUND_OFFSET;
      
      rigidBodyRef.current.setTranslation(
        { x: currentPos.x, y: targetY, z: currentPos.z },
        true
      );
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      setPlayerPosition({ x: currentPos.x, y: targetY, z: currentPos.z });
      
      console.log(`🔧 Forçado ao chão: Y=${targetY.toFixed(4)}`);
      return true;
    }
    return false;
  }, [isMounted, findGroundY, setPlayerPosition]);

  useEffect(() => {
    window.forceSnapToGround = forceSnapToGround;
    return () => { delete window.forceSnapToGround; };
  }, [forceSnapToGround]);

  useEffect(() => {
    if (!isMounted && wasMountedRef.current) {
      console.log('🔧 Desmontou do cavalo - ajustando ao chão...');
      setTimeout(() => {
        forceSnapToGround();
      }, 50);
    }
    wasMountedRef.current = isMounted;
  }, [isMounted, forceSnapToGround]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (rigidBodyRef.current && !isAdjusting && !loadingAvatar && !isMounted) {
        const pos = rigidBodyRef.current.translation();
        if (pos.y > 1) {
          console.log('🔄 Verificação periódica (3s): ajustando player ao chão...');
          forceSnapToGround();
        }
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [loadingAvatar, isAdjusting, isMounted, forceSnapToGround]);

  useFrame(() => {
    if (!rigidBodyRef.current || loadingAvatar || isMounted) return;
    
    const vel = rigidBodyRef.current.linvel();
    const pos = rigidBodyRef.current.translation();
    
    if (vel.y < -2 && pos.y > 2) {
      isFallingRef.current = true;
    }
    
    if (isFallingRef.current && Math.abs(vel.y) < 0.05) {
      isFallingRef.current = false;
      forceSnapToGround();
    }
  });

  useFrame(({ camera }) => {
    if (!rigidBodyRef.current || loadingAvatar) return;
    frameCounter.current++;

    if (isMounted) {
      playAnimation('idle2');
      if (visualRef.current) {
        visualRef.current.rotation.y = mountRotation;
      }
      return;
    }

    const position = rigidBodyRef.current.translation();
    setPlayerPosition({ x: position.x, y: position.y, z: position.z });

    const { x: dx, z: dz } = moveDir.current;
    const currentVel = rigidBodyRef.current.linvel();
    const grounded = Math.abs(currentVel.y) < 0.05;
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

    if (frameCounter.current % 10 === 0 && grounded && !isFallingRef.current) {
      forceSnapToGround();
    }

    if (frameCounter.current % 30 === 0) {
      const vel = rigidBodyRef.current.linvel();
      const horizontalSpeed = Math.sqrt((vel.x * vel.x) + (vel.z * vel.z));
      const isMovingCheck = moveDir.current.x !== 0 || moveDir.current.z !== 0;
      
      if (isMovingCheck && horizontalSpeed < 0.01 && grounded) {
        const now = Date.now();
        if (now - lastStuckTime.current > 100) {
          lastStuckTime.current = now;
          stuckAttempts.current += 1;
          if (stuckAttempts.current >= 3) {
            const snapResult = forceSnapToGround();
            if (!snapResult) {
              rigidBodyRef.current.setLinvel({ 
                x: vel.x * 0.5, 
                y: 0.5, 
                z: vel.z * 0.5 
              }, true);
            }
            stuckAttempts.current = 0;
          }
        }
      } else {
        stuckAttempts.current = 0;
      }
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (rigidBodyRef.current && worldGroupRef?.current && !isMounted) {
        forceSnapToGround();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [currentScene, worldGroupRef, isMounted, forceSnapToGround]);

  if (loadingAvatar) {
    return (
      <RigidBody ref={rigidBodyRef} mass={1} position={[0, 50, 0]}>
        <CapsuleCollider args={[0.3, 0.4]} />
      </RigidBody>
    );
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      mass={1}
      position={[0, 20, 0]}
      linearDamping={0.5}
      enabledRotations={[false, false, false]}
      colliders={false}  // 🔥 IMPEDE O RAPIER DE CRIAR COLLIDERS AUTOMATICAMENTE
    >
      {/* 🔥 APENAS UM CAPSULE COLLIDER - SEM CUBOS, SEM BOX */}
      <CapsuleCollider args={[0.3, 0.4]} position={[0, VISUAL_OFFSET_Y, VISUAL_OFFSET_Z]} />
      
      <group>
        {isNight && (
          <pointLight
            intensity={5.2}
            distance={3}
            decay={0.3}
            color={0xffaa66}
            position={[0, -0.6, 0]}
          />
        )}
        
        <group 
          ref={visualRef} 
          scale={AVATAR_SCALE} 
          position={[
            0, 
            isMounted ? 0 : VISUAL_OFFSET_Y, 
            isMounted ? 0 : VISUAL_OFFSET_Z
          ]}
        >
          <primitive object={bodyScene} ref={bodyModelRef} />
          
          {hairIndex >= 0 && hairScene && (
            <primitive object={hairScene} ref={hairModelRef} />
          )}

          {bodyModelRef.current && (
            <>
              {equippedItems.weapon && (
                <EquipmentAttachment 
                  key={`weapon-${equippedItems.weapon.id || Date.now()}`}
                  playerModel={bodyModelRef.current} 
                  equipmentSlot="weapon" 
                  itemData={equippedItems.weapon}
                  customPosition={equippedItems.weapon.customPosition}
                  customRotation={equippedItems.weapon.customRotation}
                  customScale={equippedItems.weapon.customScale}
                />
              )}
              {equippedItems.shield && (
                <EquipmentAttachment 
                  key={`shield-${equippedItems.shield.id || Date.now()}`}
                  playerModel={bodyModelRef.current} 
                  equipmentSlot="shield" 
                  itemData={equippedItems.shield}
                  customPosition={equippedItems.shield.customPosition}
                  customRotation={equippedItems.shield.customRotation}
                  customScale={equippedItems.shield.customScale}
                />
              )}
              {equippedItems.helmet && (
                <EquipmentAttachment 
                  key={`helmet-${equippedItems.helmet.id || Date.now()}`}
                  playerModel={bodyModelRef.current} 
                  equipmentSlot="helmet" 
                  itemData={equippedItems.helmet}
                  customPosition={equippedItems.helmet.customPosition}
                  customRotation={equippedItems.helmet.customRotation}
                  customScale={equippedItems.helmet.customScale}
                />
              )}
              {equippedItems.chest && (
                <EquipmentAttachment 
                  key={`chest-${equippedItems.chest.id || Date.now()}`}
                  playerModel={bodyModelRef.current} 
                  equipmentSlot="chest" 
                  itemData={equippedItems.chest}
                  customPosition={equippedItems.chest.customPosition}
                  customRotation={equippedItems.chest.customRotation}
                  customScale={equippedItems.chest.customScale}
                />
              )}
              {equippedItems.shoulders && (
                <EquipmentAttachment 
                  key={`shoulders-${equippedItems.shoulders.id || Date.now()}`}
                  playerModel={bodyModelRef.current} 
                  equipmentSlot="shoulders" 
                  itemData={equippedItems.shoulders}
                  customPosition={equippedItems.shoulders.customPosition}
                  customRotation={equippedItems.shoulders.customRotation}
                  customScale={equippedItems.shoulders.customScale}
                />
              )}
            </>
          )}
        </group>
      </group>
    </RigidBody>
  );
};

export default AvatarPlayer;

useGLTF.preload(AVATAR_MODEL_PATH);