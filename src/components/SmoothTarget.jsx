// src/components/SmoothTarget.jsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import useGameStore from '../hooks/useGameStore';

export const SmoothTarget = ({ onTargetUpdate }) => {
  const playerPosition = useGameStore((state) => state.playerPosition);
  const currentTarget = useRef(new Vector3(0, 0, 0));
  const targetRef = useRef(new Vector3(0, 0, 0));

  useFrame(() => {
    if (!playerPosition) return;
    // Ponto desejado: posição do jogador + altura (0.8)
    const desired = new Vector3(playerPosition.x, playerPosition.y + 0.8, playerPosition.z);
    targetRef.current.copy(desired);
    // Interpola linear para suavizar
    currentTarget.current.lerp(targetRef.current, 0.1);
    if (onTargetUpdate) {
      onTargetUpdate([currentTarget.current.x, currentTarget.current.y, currentTarget.current.z]);
    }
  });

  return null;
};