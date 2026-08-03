import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../hooks/useGameStore';

/**
 * Componente que só renderiza objetos dentro de um raio do jogador
 * Use como wrapper nos objetos que quer otimizar
 *
 * 🔥 OTIMIZADO: lê `playerPosition` via getState() dentro do useFrame
 * em vez de assinar com selector. Assinar o store aqui fazia o componente
 * re-renderizar a CADA frame (porque Player atualiza playerPosition por frame).
 */
export const OptimizedRenderer = ({ 
  children, 
  position, 
  radius = 25, 
  enabled = true 
}) => {
  const ref = useRef();
  
  useFrame(() => {
    if (!enabled || !ref.current) return;
    
    // 🔥 getState() NÃO causa re-render (ao contrário de assinar com selector)
    const playerPosition = useGameStore.getState().playerPosition;
    if (!playerPosition) return;
    
    const dx = ref.current.position.x - playerPosition.x;
    const dz = ref.current.position.z - playerPosition.z;
    const distSq = dx * dx + dz * dz;
    const radiusSq = radius * radius;
    
    ref.current.visible = distSq <= radiusSq;
  });
  
  if (!enabled) return children;
  
  return <group ref={ref}>{children}</group>;
};

