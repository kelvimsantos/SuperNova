// components/items/ItemPickup.jsx
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';
import { ItemDatabase } from '../inventory/ItemTypes';

export const ItemPickup = ({ itemId, position, itemData }) => {
  const ref = useRef();
  const [isNear, setIsNear] = useState(false);
  const [collected, setCollected] = useState(false);
  const player = useGameStore(state => state.playerRigidBody);
  const addToInventory = useGameStore(state => state.addToInventory);
  
  // Dados do item (usa o database ou o passado por props)
  const itemInfo = itemData || ItemDatabase[itemId];
  
  if (!itemInfo) return null;
  
  // Animação flutuante
  useFrame(({ clock }) => {
    if (ref.current && !collected) {
      const time = clock.getElapsedTime();
      ref.current.position.y = position[1] + Math.sin(time * 2) * 0.1;
      ref.current.rotation.y = time;
    }
  });
  
  // Detecção de proximidade
  useFrame(() => {
    if (!player || collected) return;
    
    const playerPos = player.translation();
    const itemPos = ref.current?.position;
    
    if (itemPos) {
      const dx = playerPos.x - itemPos.x;
      const dz = playerPos.z - itemPos.z;
      const dy = playerPos.y - itemPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      setIsNear(distance < 2);
      
      // Coleta automática quando muito perto
      if (distance < 1.2) {
        console.log(`🎁 Coletou: ${itemInfo.name}`);
        addToInventory({
          ...itemInfo,
          quantity: 1,
        });
        setCollected(true);
      }
    }
  });
  
  if (collected) return null;
  
  return (
    <group ref={ref} position={position}>
      {/* Ícone 3D do item */}
      <Box args={[0.5, 0.5, 0.5]}>
        <meshStandardMaterial 
          color={itemInfo.rarity?.color || '#ffaa44'} 
          emissive={itemInfo.rarity?.color || '#ffaa44'}
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.3}
        />
      </Box>
      
      {/* Anel de brilho */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <ringGeometry args={[0.4, 0.6, 16]} />
        <meshStandardMaterial 
          color={itemInfo.rarity?.color || '#ffaa44'} 
          emissive={itemInfo.rarity?.color || '#ffaa44'}
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Texto flutuante quando perto */}
      {isNear && (
        <Text
          position={[0, 0.8, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {itemInfo.name}
        </Text>
      )}
    </group>
  );
};