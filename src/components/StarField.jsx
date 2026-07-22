import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const StarField = ({ enabled = true }) => {
  const pointsRef = useRef();
  const count = 500;
  const positions = useMemo(() => {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 200;
    const z = (Math.random() - 0.5) * 200;
    const y = -15; // abaixo do chão
    pos[i*3] = x;
    pos[i*3+1] = y;
    pos[i*3+2] = z;
  }
  return pos;
}, []);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  if (!enabled) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
};

