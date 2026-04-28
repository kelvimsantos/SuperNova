import { useRef, useEffect, useState } from 'react';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3, Raycaster } from 'three';
import useGameStore from '../hooks/useGameStore';
import { EquipmentAttachment } from './equipment/EquipmentAttachment';

const MODEL_PATH = '/models/player.glb';

export const Player = () => {
  const rigidBodyRef = useRef();
  const visualRef = useRef();
  const playerModelRef = useRef(null); // 🔥 Para referência do modelo
  const moveDir = useRef({ x: 0, z: 0 });
  const [isGrounded, setIsGrounded] = useState(true);
  const setPlayerRigidBody = useGameStore((state) => state.setPlayerRigidBody);
  const currentAnim = useRef('Idle');
  const isNight = useGameStore((state) => state.isNight);
  const currentScene = useGameStore((state) => state.currentScene);
  const worldGroupRef = useGameStore((state) => state.worldGroupRef);
  const [isAdjusting, setIsAdjusting] = useState(false);
  
  // 🔥 EQUIPAMENTOS
  const equippedItems = useGameStore(state => state.equippedItems);

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

  // 🔥 FUNÇÃO PARA ENCONTRAR O CHÃO COM RAYCAST SUBINDO GRADUALMENTE
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
        console.log(`✅ Chão encontrado em Y=${groundY.toFixed(2)}. Ajustando player para Y=${newY.toFixed(2)}`);
        rigidBodyRef.current.setTranslation({ x: currentPos.x, y: newY, z: currentPos.z }, true);
      } else {
        const newY = currentPos.y + 20;
        console.log(`⚠️ Chão não encontrado. Subindo player para Y=${newY}`);
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

  // 🔥 DEBUG: Lista todos os ossos disponíveis no modelo
  useEffect(() => {
    if (scene) {
      const bones = [];
      scene.traverse((child) => {
        if (child.isBone || (child.isMesh && (child.name.toLowerCase().includes('hand') || child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('spine')))) {
          bones.push({
            name: child.name,
            type: child.isBone ? '🦴 Bone' : '📦 Mesh',
            position: child.position
          });
        }
      });
      
      if (bones.length > 0) {
        console.log('🦴 Ossos encontrados no modelo:');
        bones.forEach(bone => {
          console.log(`   - ${bone.name} (${bone.type}) pos: ${bone.position.x}, ${bone.position.y}, ${bone.position.z}`);
        });
      } else {
        console.warn('⚠️ Nenhum osso encontrado! Verifique o modelo GLB');
      }
    }
  }, [scene]);

  // 🔥 EXECUTA QUANDO A CENA MUDA OU O PLAYER É CRIADO
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rigidBodyRef.current && worldGroupRef?.current) {
        console.log(`🔍 Buscando chão na cena: ${currentScene}`);
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
      console.log('⚠️ Player caiu muito baixo, procurando chão novamente...');
      findGroundAndAdjust();
    }
  });

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
        <mesh visible={false}>
          <boxGeometry args={[0.2, 0.5, 0.2]} />
          <meshStandardMaterial color="hotpink" />
        </mesh>
        
        {/* 🔥 PERSONAGEM + EQUIPAMENTOS */}
        <group ref={visualRef} scale={0.25} position={[0, -0.7, 0]}>
          <primitive object={scene} ref={playerModelRef} />
          
          {/* 🔥 EQUIPAMENTOS VISÍVEIS */}
          {playerModelRef.current && (
            <>
              {equippedItems.weapon && (
                <EquipmentAttachment 
                  playerModel={playerModelRef.current} 
                  equipmentSlot="weapon" 
                  itemData={equippedItems.weapon}
                />
              )}
              {equippedItems.shield && (
                <EquipmentAttachment 
                  playerModel={playerModelRef.current} 
                  equipmentSlot="shield" 
                  itemData={equippedItems.shield}
                />
              )}
              {equippedItems.helmet && (
                <EquipmentAttachment 
                  playerModel={playerModelRef.current} 
                  equipmentSlot="helmet" 
                  itemData={equippedItems.helmet}
                />
              )}
              {equippedItems.chest && (
                <EquipmentAttachment 
                  playerModel={playerModelRef.current} 
                  equipmentSlot="chest" 
                  itemData={equippedItems.chest}
                />
              )}
              {equippedItems.shoulders && (
                <EquipmentAttachment 
                  playerModel={playerModelRef.current} 
                  equipmentSlot="shoulders" 
                  itemData={equippedItems.shoulders}
                />
              )}
            </>
          )}
        </group>
      </group>
    </RigidBody>
  );
};

useGLTF.preload(MODEL_PATH);