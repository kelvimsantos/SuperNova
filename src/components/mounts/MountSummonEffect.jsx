import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * MountSummonEffect - Efeito de partículas de fumaça/explosão ao invocar montaria
 * Aparece por ~1.5s e desaparece
 */
export function MountSummonEffect({ position, active, onComplete }) {
  const particlesRef = useRef();
  const timeRef = useRef(0);
  const hasCompletedRef = useRef(false);

  const count = 60;

  const { positions, velocities, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const siz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 0.1 + Math.random() * 0.3;

      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius;
      pos[i * 3 + 2] = Math.cos(phi) * radius;

      vel[i * 3] = (Math.random() - 0.5) * 3;
      vel[i * 3 + 1] = 1 + Math.random() * 3;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 3;

      siz[i] = 0.15 + Math.random() * 0.3;
    }

    return { positions: pos, velocities: vel, sizes: siz };
  }, []);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: '#888888',
      size: 0.4,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
  }, []);

  useFrame((_, delta) => {
    if (!active || !particlesRef.current) return;

    timeRef.current += delta;

    const geometry = particlesRef.current.geometry;
    const posAttr = geometry.attributes.position;
    const array = posAttr.array;

    for (let i = 0; i < count; i++) {
      array[i * 3] += velocities[i * 3] * delta;
      array[i * 3 + 1] += velocities[i * 3 + 1] * delta - 1.5 * delta; // gravity
      array[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }

    posAttr.needsUpdate = true;

    const life = Math.max(0, 1 - timeRef.current / 1.5);
    material.opacity = life * 0.8;
    material.size = 0.4 * (0.3 + life * 0.7);

    if (life <= 0 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      if (onComplete) onComplete();
    }
  });

  if (!active) return null;

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}
