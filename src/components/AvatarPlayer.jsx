// src/components/AvatarPlayer.jsx
import { useRef, useEffect, useState } from 'react';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3, Raycaster, Vector3 as ThreeVector3, Quaternion } from 'three'; // 🔥 IMPORT CORRETO
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

// 🔥 AJUSTE DO CABELO (subir no Y)
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
  const [isAdjusting, setIsAdjusting] = useState(false);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const playerHealth = useGameStore((state) => state.playerHealth);
  const isDead = playerHealth <= 0;

  // 🔥 EQUIPAMENTOS
  const equippedItems = useGameStore(state => state.equippedItems);

  // 🔥 Ref para controlar tentativas de desengate
  const stuckAttempts = useRef(0);
  const lastStuckTime = useRef(0);

  const { scene: bodyScene, animations } = useGLTF(AVATAR_MODEL_PATH);
  
  const hairIndex = avatarConfig?.hairIndex ?? -1;
  const hairPath = hairIndex >= 0 ? `${HAIR_BASE_PATH}${String(hairIndex + 1).padStart(2, '0')}.glb` : null;
  const { scene: hairScene } = useGLTF(hairPath || '');
  
  const { actions } = useAnimations(animations, bodyModelRef);

  // 🔥 REFERÊNCIAS PARA OS OSSOS
  const [boneRefs, setBoneRefs] = useState({
    rightHand: null,
    leftHand: null,
    head: null,
    spine: null,
    rightShoulder: null,
    leftShoulder: null,
  });

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

  // 🔥 BUSCA TODOS OS OSSOS DO MODELO
  useEffect(() => {
    if (!bodyModelRef.current) return;
    
    const findBone = (namePatterns) => {
      let found = null;
      bodyModelRef.current.traverse((child) => {
        if (child.isBone && !found) {
          const boneName = child.name.toLowerCase();
          for (const pattern of namePatterns) {
            if (boneName.includes(pattern.toLowerCase())) {
              found = child;
              break;
            }
          }
        }
      });
      return found;
    };

    const rightHand = findBone(['mixamorigrighthand', 'righthand', 'hand_r', 'right_hand']);
    const leftHand = findBone(['mixamoriglefthand', 'lefthand', 'hand_l', 'left_hand']);
    const head = findBone(['mixamorighead', 'head']);
    const spine = findBone(['mixamorigspine2', 'spine2', 'spine_02']);
    const rightShoulder = findBone(['mixamorigrightshoulder', 'rightshoulder', 'shoulder_r']);
    const leftShoulder = findBone(['mixamorigleftshoulder', 'leftshoulder', 'shoulder_l']);

    console.log('🦴 Ossos encontrados:', {
      rightHand: rightHand?.name || '❌',
      leftHand: leftHand?.name || '❌',
      head: head?.name || '❌',
      spine: spine?.name || '❌',
      rightShoulder: rightShoulder?.name || '❌',
      leftShoulder: leftShoulder?.name || '❌',
    });

    setBoneRefs({
      rightHand,
      leftHand,
      head,
      spine,
      rightShoulder,
      leftShoulder,
    });
  }, [bodyModelRef.current]);

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

  // 🔥 FUNÇÃO PARA AJUSTAR AO CHÃO
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

  // 🔥 FUNÇÃO PARA DETECTAR E RESOLVER TRAVAMENTO EM QUINAS
  const checkAndResolveStuck = () => {
    if (!rigidBodyRef.current) return;
    
    const vel = rigidBodyRef.current.linvel();
    const horizontalSpeed = Math.sqrt((vel.x * vel.x) + (vel.z * vel.z));
    const isMoving = moveDir.current.x !== 0 || moveDir.current.z !== 0;
    
    if (isMoving && horizontalSpeed < 0.01) {
      const now = Date.now();
      
      if (now - lastStuckTime.current < 100) return;
      lastStuckTime.current = now;
      
      stuckAttempts.current += 1;
      
      if (stuckAttempts.current >= 3) {
        rigidBodyRef.current.setLinvel({ 
          x: vel.x * 0.5, 
          y: 0.5, 
          z: vel.z * 0.5 
        }, true);
        
        stuckAttempts.current = 0;
      }
    } else {
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

  // 🔥 VERIFICAÇÃO CONTÍNUA
  useFrame(() => {
    if (!rigidBodyRef.current || isAdjusting) return;
    const pos = rigidBodyRef.current.translation();
    
    checkAndResolveStuck();
    
    if (pos.y < -10) {
      findGroundAndAdjust();
    }
  });

  // 🔥 VERIFICAÇÃO PERIÓDICA
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

  // 🔥 COMPONENTE DE EQUIPAMENTO SIMPLES (SEM THREE GLOBAL)
  const EquipmentItem = ({ bone, position, rotation, scale, color, shape }) => {
    const groupRef = useRef();
    const pos = useRef(new Vector3());
    const quat = useRef(new Quaternion());

    useFrame(() => {
      if (!groupRef.current || !bone) return;
      bone.getWorldPosition(pos.current);
      bone.getWorldQuaternion(quat.current);
      groupRef.current.position.copy(pos.current);
      groupRef.current.quaternion.copy(quat.current);
    });

    // Se não tem osso, mostra ponto vermelho
    if (!bone) {
      return (
        <mesh position={[0, 2, 0]} scale={[0.15, 0.15, 0.15]}>
          <sphereGeometry args={[0.5]} />
          <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
        </mesh>
      );
    }

    // Formas dos equipamentos
    const renderShape = () => {
      switch(shape) {
        case 'sword':
          return (
            <group>
              <mesh position={[0, -0.15, 0]}>
                <boxGeometry args={[0.04, 0.12, 0.04]} />
                <meshStandardMaterial color="#8B4513" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.12, 0]}>
                <boxGeometry args={[0.06, 0.3, 0.02]} />
                <meshStandardMaterial color="#CCCCCC" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                <coneGeometry args={[0.03, 0.06, 6]} />
                <meshStandardMaterial color="#CCCCCC" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          );
        case 'shield':
          return (
            <mesh>
              <cylinderGeometry args={[0.2, 0.22, 0.04, 12]} />
              <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
            </mesh>
          );
        case 'helmet':
          return (
            <mesh>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
            </mesh>
          );
        case 'chest':
          return (
            <mesh>
              <boxGeometry args={[0.3, 0.35, 0.1]} />
              <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
            </mesh>
          );
        case 'shoulder':
          return (
            <mesh>
              <boxGeometry args={[0.2, 0.08, 0.2]} />
              <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
            </mesh>
          );
        default:
          return (
            <mesh>
              <boxGeometry args={[0.15, 0.15, 0.15]} />
              <meshStandardMaterial color={color} />
            </mesh>
          );
      }
    };

    return (
      <group ref={groupRef}>
        <group position={position} rotation={rotation} scale={scale}>
          {renderShape()}
        </group>
      </group>
    );
  };

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

          {/* 🔥 EQUIPAMENTOS */}
          {console.log('🎯 Renderizando equipamentos:', {
            weapon: equippedItems.weapon?.name,
            shield: equippedItems.shield?.name,
            hasRightHand: !!boneRefs.rightHand,
            hasLeftHand: !!boneRefs.leftHand
          })}
          
          {/* ESPADA - MÃO DIREITA */}
          {equippedItems.weapon && (
            <EquipmentItem
              bone={boneRefs.rightHand}
              position={[0.15, -0.05, 0.05]}
              rotation={[0.5, 0, 0.5]}
              scale={[0.5, 0.5, 0.5]}
              color="#ff4444"
              shape="sword"
            />
          )}

          {/* ESCUDO - MÃO ESQUERDA */}
          {equippedItems.shield && (
            <EquipmentItem
              bone={boneRefs.leftHand}
              position={[-0.15, -0.05, 0.05]}
              rotation={[0.5, 0, -0.5]}
              scale={[0.5, 0.5, 0.5]}
              color="#4444ff"
              shape="shield"
            />
          )}

          {/* CAPACETE */}
          {equippedItems.helmet && (
            <EquipmentItem
              bone={boneRefs.head}
              position={[0, 0.15, 0]}
              rotation={[0, 0, 0]}
              scale={[0.45, 0.45, 0.45]}
              color="#ffaa44"
              shape="helmet"
            />
          )}

          {/* PEITORAL */}
          {equippedItems.chest && (
            <EquipmentItem
              bone={boneRefs.spine}
              position={[0, 0.05, -0.05]}
              rotation={[0, 0, 0]}
              scale={[0.5, 0.5, 0.5]}
              color="#44ffaa"
              shape="chest"
            />
          )}

          {/* OMBREIRAS */}
          {equippedItems.shoulders && (
            <>
              <EquipmentItem
                bone={boneRefs.rightShoulder}
                position={[0.15, 0, 0]}
                rotation={[0, 0, 0.3]}
                scale={[0.4, 0.4, 0.4]}
                color="#aa44ff"
                shape="shoulder"
              />
              <EquipmentItem
                bone={boneRefs.leftShoulder}
                position={[-0.15, 0, 0]}
                rotation={[0, 0, -0.3]}
                scale={[0.4, 0.4, 0.4]}
                color="#aa44ff"
                shape="shoulder"
              />
            </>
          )}
        </group>
      </group>
    </RigidBody>
  );
};

export default AvatarPlayer;

useGLTF.preload(AVATAR_MODEL_PATH);