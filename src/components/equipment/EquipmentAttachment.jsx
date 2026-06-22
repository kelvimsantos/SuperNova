// components/equipment/EquipmentAttachment.jsx
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 🔥 CONFIGURAÇÃO DE CADA SLOT
const EQUIPMENT_CONFIG = {
  weapon: {
    boneNames: ['mixamorigRightHand', 'RightHand', 'hand_r', 'Hand_R', 'right_hand'],
    positionOffset: [0.15, -0.05, 0.05],
    rotationOffset: [0.5, 0, 0.5],
    scale: [0.5, 0.5, 0.5],
    color: '#ff4444',
    shape: 'sword'
  },
  shield: {
    boneNames: ['mixamorigLeftHand', 'LeftHand', 'hand_l', 'Hand_L', 'left_hand'],
    positionOffset: [-0.15, -0.05, 0.05],
    rotationOffset: [0.5, 0, -0.5],
    scale: [0.5, 0.5, 0.5],
    color: '#4444ff',
    shape: 'shield'
  },
  helmet: {
    boneNames: ['mixamorigHead', 'Head', 'head'],
    positionOffset: [0, 0.15, 0],
    rotationOffset: [0, 0, 0],
    scale: [0.45, 0.45, 0.45],
    color: '#ffaa44',
    shape: 'sphere'
  },
  chest: {
    boneNames: ['mixamorigSpine2', 'Spine2', 'spine_02'],
    positionOffset: [0, 0.05, -0.05],
    rotationOffset: [0, 0, 0],
    scale: [0.5, 0.5, 0.5],
    color: '#44ffaa',
    shape: 'box'
  },
  shoulders: {
    boneNames: ['mixamorigRightShoulder', 'RightShoulder', 'mixamorigLeftShoulder', 'LeftShoulder'],
    positionOffset: [0.15, 0, 0],
    rotationOffset: [0, 0, 0.3],
    scale: [0.4, 0.4, 0.4],
    color: '#aa44ff',
    shape: 'shoulder'
  }
};

export const EquipmentAttachment = ({ playerModel, equipmentSlot, itemData }) => {
  const [bone, setBone] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const equipmentRef = useRef();
  const mountedRef = useRef(true);
  
  useEffect(() => {
    console.log(`🔍 EquipmentAttachment: ${equipmentSlot}`, {
      hasModel: !!playerModel,
      hasItem: !!itemData,
      itemName: itemData?.name,
      modelType: playerModel?.type
    });
    
    if (!playerModel || !itemData || !mountedRef.current) {
      console.log(`⚠️ ${equipmentSlot}: sem modelo ou item`);
      return;
    }
    
    const config = EQUIPMENT_CONFIG[equipmentSlot];
    if (!config) {
      console.warn(`⚠️ Configuração não encontrada para: ${equipmentSlot}`);
      return;
    }
    
    // 🔥 LISTA TODOS OS OSSOS DO MODELO
    const availableBones = [];
    playerModel.traverse((child) => {
      if (child.isBone) {
        availableBones.push(child.name);
      }
    });
    
    console.log(`🦴 Ossos disponíveis no modelo (${availableBones.length}):`, availableBones);
    
    // 🔥 PROCURA O OSSO
    let foundBone = null;
    let foundName = '';
    
    playerModel.traverse((child) => {
      if (child.isBone && !foundBone) {
        const boneName = child.name;
        for (const targetName of config.boneNames) {
          if (boneName === targetName || 
              boneName.toLowerCase().includes(targetName.toLowerCase()) || 
              targetName.toLowerCase().includes(boneName.toLowerCase())) {
            foundBone = child;
            foundName = boneName;
            break;
          }
        }
      }
    });
    
    if (foundBone) {
      console.log(`✅ ${equipmentSlot} (${itemData.name}) anexado ao osso: ${foundName}`);
      setBone(foundBone);
      setDebugInfo(`✅ ${foundName}`);
    } else {
      console.warn(`❌ Osso NÃO encontrado para ${equipmentSlot}. Procurados:`, config.boneNames);
      console.warn(`   Dica: Os ossos disponíveis são:`, availableBones);
      setDebugInfo(`❌ Não encontrado`);
      setBone(null);
    }
  }, [playerModel, equipmentSlot, itemData]);
  
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();

  useFrame(() => {
    if (!equipmentRef.current || !bone || !mountedRef.current) return;

    bone.getWorldPosition(tmpPos);
    bone.getWorldQuaternion(tmpQuat);

    equipmentRef.current.position.copy(tmpPos);
    equipmentRef.current.quaternion.copy(tmpQuat);
  });
  
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  if (!bone || !itemData) {
    // 🔥 MOSTRA UM PONTO DE DEBUG
    return (
      <mesh position={[0, 2, 0]} scale={[0.15, 0.15, 0.15]}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
      </mesh>
    );
  }
  
  const config = EQUIPMENT_CONFIG[equipmentSlot];
  
  // 🔥 FORMAS GEOMÉTRICAS
  const getShape = () => {
    switch(config.shape) {
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
            <meshStandardMaterial color={config.color} metalness={0.7} roughness={0.3} />
          </mesh>
        );
      case 'sphere':
        return (
          <mesh>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={config.color} metalness={0.6} roughness={0.4} />
          </mesh>
        );
      case 'box':
        return (
          <mesh>
            <boxGeometry args={[0.3, 0.35, 0.1]} />
            <meshStandardMaterial color={config.color} metalness={0.5} roughness={0.5} />
          </mesh>
        );
      case 'shoulder':
        return (
          <mesh>
            <boxGeometry args={[0.2, 0.08, 0.2]} />
            <meshStandardMaterial color={config.color} metalness={0.6} roughness={0.4} />
          </mesh>
        );
      default:
        return (
          <mesh>
            <boxGeometry args={[0.15, 0.15, 0.15]} />
            <meshStandardMaterial color={config.color} />
          </mesh>
        );
    }
  };
  
  return (
    <group ref={equipmentRef}>
      <group 
        position={config.positionOffset} 
        rotation={config.rotationOffset} 
        scale={config.scale}
      >
        {getShape()}
      </group>
    </group>
  );
};