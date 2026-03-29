import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../hooks/useGameStore';

/**
 * Componente que só renderiza objetos dentro de um raio do jogador
 * Use como wrapper nos objetos que quer otimizar
 */
export const OptimizedRenderer = ({ 
  children, 
  position, 
  radius = 25, 
  enabled = true 
}) => {
  const ref = useRef();
  const playerPosition = useGameStore((state) => state.playerPosition);
  
  useFrame(() => {
    if (!enabled || !ref.current || !playerPosition) return;
    
    const dx = ref.current.position.x - playerPosition.x;
    const dz = ref.current.position.z - playerPosition.z;
    const distSq = dx * dx + dz * dz;
    const radiusSq = radius * radius;
    
    ref.current.visible = distSq <= radiusSq;
  });
  
  if (!enabled) return children;
  
  return <group ref={ref}>{children}</group>;
};