// src/components/SmoothTarget.jsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import useGameStore from '../hooks/useGameStore';

export const SmoothTarget = ({ controlsRef }) => {
  const currentTarget = useRef(new Vector3(0, 0, 0));
  const targetRef = useRef(new Vector3(0, 0, 0));

  useFrame(() => {
    const playerPosition = useGameStore.getState().playerPosition;
    if (!playerPosition) return;
    // Ponto desejado: posição do jogador + altura (0.8)
    targetRef.current.set(playerPosition.x, playerPosition.y + 0.8, playerPosition.z);
    // Interpola linear para suavizar
    currentTarget.current.lerp(targetRef.current, 0.1);
    const controls = controlsRef?.current;
    if (controls) {
      controls.target.copy(currentTarget.current);
    }
  });

  return null;
};