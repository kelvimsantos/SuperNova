// components/TestDummy.jsx
import { useRef, useState } from 'react';
import { Box, Text } from '@react-three/drei';
import useGameStore from '../hooks/useGameStore';
import { ItemDatabase } from './inventory/ItemTypes';

export const TestDummy = ({ position, dropItems = ['golden_coin'] }) => {
  const ref = useRef();
  const [health, setHealth] = useState(50);
  const [hitFlash, setHitFlash] = useState(false);
  const addToInventory = useGameStore(state => state.addToInventory);
  
  const handleClick = () => {
    const newHealth = health - 15;
    setHealth(newHealth);
    setHitFlash(true);
    setTimeout(() => setHitFlash(false), 150);
    
    if (newHealth <= 0) {
      console.log('🎯 Alvo destruído! Dropando itens...');
      dropItems.forEach(itemId => {
        const itemInfo = ItemDatabase[itemId];
        if (itemInfo) {
          addToInventory({ ...itemInfo, quantity: 1 });
        }
      });
      if (ref.current) ref.current.visible = false;
    }
  };
  
  if (health <= 0) return null;
  
  return (
    <group ref={ref} position={position}>
      <Box args={[0.8, 0.8, 0.8]} onClick={handleClick}>
        <meshStandardMaterial 
          color={hitFlash ? '#ff8888' : '#8888ff'} 
          emissive={hitFlash ? '#ff0000' : '#0000ff'}
          emissiveIntensity={0.3}
        />
      </Box>
      <Text position={[0, 0.6, 0]} fontSize={0.15} color="white">
        🎯 Teste | ❤️ {Math.max(0, health)}
      </Text>
    </group>
  );
};