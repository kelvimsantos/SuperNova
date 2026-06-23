// components/equipment/EquipmentAttachment.jsx
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 🔥 CONFIGURAÇÃO COM OS OSSOS CORRETOS DO SEU MODELO
const EQUIPMENT_CONFIG = {
  weapon: {
    boneNames: ['mixamorigRightHand_15', 'mixamorigRightHand', 'RightHand'], // Mão direita
    positionOffset: [-0.8, 0.9, 0.1], // Ajuste de posição
    rotationOffset: [0.8, 0.1, 0.3], // Rotação da arma
    scale: [2.5, 2.5, 5], // Tamanho da arma
    color: '#ff4444',
    shape: 'sword'
  },
  shield: {
    boneNames: ['mixamorigLeftHand_7', 'mixamorigLeftHand', 'LeftHand'], // Mão esquerda
    positionOffset: [0.3, 1.00, 1.0],
    rotationOffset: [1, 0, 90],
    scale: [1.5, 1.5, 1.5],
    color: '#4444ff',
    shape: 'shield'
  },
  helmet: {
    boneNames: ['mixamorigHead_1', 'mixamorigHead', 'Head'], // Cabeça
    positionOffset: [0, 0.12, 0.05],
    rotationOffset: [0, 0, 0],
    scale: [0.5, 0.5, 0.5],
    color: '#ffaa44',
    shape: 'sphere'
  },
  chest: {
    boneNames: ['mixamorigSpine2_21', 'mixamorigSpine', 'Spine2'], // Tronco
    positionOffset: [0, 1.5, -0.2],
    rotationOffset: [0, 0.0, 0],
    scale: [2., 2., 2.],
    color: '#44ffaa',
    shape: 'box'
  },
  shoulders: {
    boneNames: ['mixamorigRightShoulder_18', 'mixamorigLeftShoulder_10', 'Shoulder'], // Ombros
    positionOffset: [0.2, 0, 0.1],
    rotationOffset: [0, 0, 0.5],
    scale: [0.4, 0.4, 0.4],
    color: '#aa44ff',
    shape: 'shoulder'
  }
};

export const EquipmentAttachment = ({ playerModel, equipmentSlot, itemData }) => {
  const [bone, setBone] = useState(null);
  const equipmentRef = useRef();
  
  useEffect(() => {
    if (!playerModel || !itemData) return;
    
    const config = EQUIPMENT_CONFIG[equipmentSlot];
    if (!config) return;
    
    // Procura o osso específico
    let foundBone = null;
    playerModel.traverse((child) => {
      if (child.isBone) {
        const boneName = child.name;
        if (config.boneNames.some(name => boneName === name || boneName.includes(name))) {
          foundBone = child;
        }
      }
    });
    
    if (foundBone) {
      console.log(`✅ ${equipmentSlot} anexado ao osso: ${foundBone.name}`);
      setBone(foundBone);
    } else {
      console.warn(`⚠️ Osso não encontrado para ${equipmentSlot}. Nomes:`, config.boneNames);
      // Fallback: tenta qualquer osso da mão
      playerModel.traverse((child) => {
        if (child.isBone && !foundBone && (child.name.includes('Hand') || child.name.includes('hand'))) {
          foundBone = child;
        }
      });
      if (foundBone) {
        console.log(`🔧 Usando osso alternativo: ${foundBone.name}`);
        setBone(foundBone);
      }
    }
  }, [playerModel, equipmentSlot, itemData]);
  
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();

  useFrame(() => {
    if (!equipmentRef.current || !bone) return;

    // Atualiza posição/rotação em world-space (Mixamo bones costumam ter parent transforms)
    bone.getWorldPosition(tmpPos);
    bone.getWorldQuaternion(tmpQuat);

    equipmentRef.current.position.copy(tmpPos);
    equipmentRef.current.quaternion.copy(tmpQuat);
  });
  
  if (!bone || !itemData) return null;
  
  const config = EQUIPMENT_CONFIG[equipmentSlot];
  
  // 🔥 FORMAS GEOMÉTRICAS PARA CADA EQUIPAMENTO
  const getShape = () => {
    switch(config.shape) {
      case 'sword':
        return (
          <group>
            {/* Cabo da espada */}
            <mesh position={[0, -0.2, 0]}>
              <boxGeometry args={[0.08, 0.15, 0.08]} />
              <meshStandardMaterial color="#8B4513" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Lâmina */}
            <mesh position={[0, 0.15, 0]}>
              <boxGeometry args={[0.1, 0.4, 0.05]} />
              <meshStandardMaterial color="#CCCCCC" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Ponta */}
            <mesh position={[0, 0.38, 0]}>
              <coneGeometry args={[0.06, 0.1, 8]} />
              <meshStandardMaterial color="#CCCCCC" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        );
      case 'shield':
        return (
          <mesh>
            <cylinderGeometry args={[0.35, 0.35, 0.08, 16]} />
            <meshStandardMaterial color="#4444ff" metalness={0.7} roughness={0.3} />
          </mesh>
        );
      case 'sphere':
        return (
          <mesh>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#ffaa44" metalness={0.6} roughness={0.4} />
          </mesh>
        );
      case 'box':
        return (
          <mesh>
            <boxGeometry args={[0.5, 0.6, 0.2]} />
            <meshStandardMaterial color="#44ffaa" metalness={0.5} roughness={0.5} />
          </mesh>
        );
      case 'shoulder':
        return (
          <mesh>
            <boxGeometry args={[0.35, 0.15, 0.35]} />
            <meshStandardMaterial color="#aa44ff" metalness={0.6} roughness={0.4} />
          </mesh>
        );
      default:
        return (
          <mesh>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color={config.color} />
          </mesh>
        );
    }
  };
  
  return (
    <group ref={equipmentRef}>
      <group position={config.positionOffset} rotation={config.rotationOffset} scale={config.scale}>
        {getShape()}
      </group>
    </group>
  );
};