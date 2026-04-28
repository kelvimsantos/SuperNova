// components/items/ItemPickup.jsx
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text, Ring } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';
import { ItemDatabase, ItemTypes } from '../inventory/ItemTypes';

export const ItemPickup = ({ itemId, position, autoEquip = false, onPickup }) => {
  const ref = useRef();
  const [isNear, setIsNear] = useState(false);
  const [collected, setCollected] = useState(false);
  const player = useGameStore(state => state.playerRigidBody);
  const addToInventory = useGameStore(state => state.addToInventory);
  const setEquippedItem = useGameStore(state => state.setEquippedItem);
  const currentClass = useGameStore(state => state.currentClass);
  
  // Dados do item
  const itemInfo = ItemDatabase[itemId];
  
  if (!itemInfo) {
    console.warn(`⚠️ Item não encontrado: ${itemId}`);
    return null;
  }
  
  // Cores por tipo de item
  const getItemColor = () => {
    if (itemInfo.type === ItemTypes.WEAPON) return '#ff6666';
    if (itemInfo.type === ItemTypes.SHIELD) return '#6666ff';
    if (itemInfo.type === ItemTypes.HELMET) return '#ffaa44';
    if (itemInfo.type === ItemTypes.CHEST) return '#44ffaa';
    if (itemInfo.type === ItemTypes.LEGS) return '#aa44ff';
    if (itemInfo.type === ItemTypes.BOOTS) return '#ffaa88';
    if (itemInfo.type === ItemTypes.RING) return '#ffdd44';
    if (itemInfo.type === ItemTypes.NECKLACE) return '#ff44dd';
    if (itemInfo.type === ItemTypes.HEALTH_POTION) return '#ff4444';
    return itemInfo.rarity?.color || '#ffaa44';
  };
  
  // Animação flutuante
  useFrame(({ clock }) => {
    if (ref.current && !collected) {
      const time = clock.getElapsedTime();
      ref.current.position.y = position[1] + Math.sin(time * 2) * 0.15;
      ref.current.rotation.y = time;
    }
  });
  
  // Detecção de proximidade e coleta
  useFrame(() => {
    if (!player || collected) return;
    
    const playerPos = player.translation();
    const itemPos = ref.current?.position;
    
    if (itemPos) {
      const dx = playerPos.x - itemPos.x;
      const dz = playerPos.z - itemPos.z;
      const dy = playerPos.y - itemPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      setIsNear(distance < 2.5);
      
      // Coleta automática
      if (distance < 1.2) {
        collectItem();
      }
    }
  });
  
  const collectItem = () => {
    console.log(`🎁 Coletou: ${itemInfo.name}`);
    
    // Adiciona ao inventário
    addToInventory({
      ...itemInfo,
      quantity: 1,
    });
    
    // Se autoEquip for true, tenta equipar automaticamente
    if (autoEquip && itemInfo.slot) {
      const canEquip = !itemInfo.weaponClass || itemInfo.weaponClass === currentClass;
      if (canEquip) {
        setEquippedItem(itemInfo.slot, { ...itemInfo, quantity: 1 });
        console.log(`⚔️ Automaticamente equipou: ${itemInfo.name}`);
      }
    }
    
    setCollected(true);
    if (onPickup) onPickup(itemInfo);
  };
  
  if (collected) return null;
  
  const itemColor = getItemColor();
  const isEquipment = itemInfo.slot && ['weapon', 'shield', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'ring', 'necklace'].includes(itemInfo.slot);
  
  return (
    <group ref={ref} position={position}>
      {/* Luz de brilho */}
      <pointLight
        intensity={isNear ? 0.8 : 0.3}
        distance={2}
        color={itemColor}
      />
      
      {/* Anel de brilho no chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <ringGeometry args={[0.4, 0.7, 16]} />
        <meshStandardMaterial 
          color={itemColor} 
          emissive={itemColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Ícone 3D do item */}
      {isEquipment ? (
        // Equipamentos - formato diferente
        <Box args={[0.5, 0.5, 0.3]}>
          <meshStandardMaterial 
            color={itemColor} 
            emissive={itemColor}
            emissiveIntensity={0.2}
            metalness={0.7}
            roughness={0.3}
          />
        </Box>
      ) : (
        // Itens consumíveis - formato esférico
        <mesh>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial 
            color={itemColor} 
            emissive={itemColor}
            emissiveIntensity={0.2}
          />
        </mesh>
      )}
      
      {/* Anel flutuante ao redor */}
      <Ring args={[0.45, 0.55, 32]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial 
          color={itemColor} 
          emissive={itemColor}
          emissiveIntensity={0.4}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </Ring>
      
      {/* Texto flutuante quando perto */}
      {isNear && (
        <>
          <Text
            position={[0, 0.8, 0]}
            fontSize={0.2}
            color={itemInfo.rarity?.color || '#fff'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="black"
          >
            {itemInfo.name}
          </Text>
          {isEquipment && itemInfo.stats && (
            <Text
              position={[0, 0.55, 0]}
              fontSize={0.12}
              color="#aaffaa"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="black"
            >
              {Object.entries(itemInfo.stats).map(([stat, value]) => `+${value} ${stat}`).join(' | ')}
            </Text>
          )}
          {itemInfo.damage && (
            <Text
              position={[0, 0.55, 0]}
              fontSize={0.12}
              color="#ff8888"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="black"
            >
              ⚔️ Dano: {itemInfo.damage}
            </Text>
          )}
          {itemInfo.defense && (
            <Text
              position={[0, 0.55, 0]}
              fontSize={0.12}
              color="#8888ff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="black"
            >
              🛡️ Defesa: {itemInfo.defense}
            </Text>
          )}
          <Text
            position={[0, 0.4, 0]}
            fontSize={0.1}
            color="#aaa"
            anchorX="center"
            anchorY="middle"
          >
            🖱️ Aproxime-se para coletar
          </Text>
        </>
      )}
    </group>
  );
};