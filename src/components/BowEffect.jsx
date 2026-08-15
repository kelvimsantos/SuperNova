import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ARROW_LIFETIME = 1.2;
const ARROW_SPEED = 30;

export const BowEffect = () => {
  const pointsRef = useRef();
  const [arrow, setArrow] = useState(null);
  const idRef = useRef(0);

  // 🔥 Listener único do evento bowParticles
  useEffect(() => {
    const handler = (e) => {
      const { origin, direction } = e.detail;
      if (!origin || !direction) return;

      // Reutiliza o mesmo arrow object para evitar memória
      const newArrow = {
        id: ++idRef.current,
        origin: origin.clone(),
        dir: direction.clone(),
        progress: 0,
        maxProgress: ARROW_LIFETIME * ARROW_SPEED,
        alive: true,
      };
      setArrow(newArrow);
    };
    window.addEventListener('bowParticles', handler);
    return () => window.removeEventListener('bowParticles', handler);
  }, []);

  // 🔥 Anima a flecha
  useFrame((delta) => {
    if (!pointsRef.current || !arrow || !arrow.alive) return;

    arrow.progress += delta * ARROW_SPEED;

    if (arrow.progress >= arrow.maxProgress) {
      arrow.alive = false;
      setArrow(null);
      return;
    }

    // Atualiza posição da flecha ao longo do caminho
    const progressRatio = arrow.progress / arrow.maxProgress;
    const newPos = arrow.origin.clone();
    newPos.addScaledVector(arrow.dir, progressRatio * 10); // 10 unidades = distância visual

    const array = pointsRef.current.geometry.attributes.position.array;
    // Atualiza o primeiro ponto (a flecha) - reutiliza o mesmo buffer
    array[0] = newPos.x;
    array[1] = newPos.y;
    array[2] = newPos.z;
    array.needsUpdate = true;

    // Mudança de cor baseada no progresso (do ouro ao vermelho)
    const t = arrow.progress / arrow.maxProgress;
    const startColor = new THREE.Color('#ffd700');
    const endColor = new THREE.Color('#ff0000');
    const currentColor = new THREE.Color();
    currentColor.lerpColors(startColor, endColor, t);
    material.color.copy(currentColor);
  });

  if (!arrow || !arrow.alive) return null;

  // Cria geometria única reutilizada (evita memory leak)
  if (!pointsRef.current) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(3, 3));
    pointsRef.current = { geometry, material: null };
  }

  // Material com cor que muda durante a animação
  if (!pointsRef.current.material) {
    pointsRef.current.material = new THREE.PointsMaterial({
      color: '#ffd700',
      size: 0.2,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
  }

  const positions = pointsRef.current.geometry.attributes.position.array;
  // Ponto inicial (player)
  positions[0] = arrow.origin.x;
  positions[1] = arrow.origin.y;
  positions[2] = arrow.origin.z;
  // Ponto atual (movendo ao longo da direção)
  const progress = arrow.progress;
  const dirScaled = new THREE.Vector3(
    arrow.dir.x * (progress / arrow.maxProgress * 10),
    arrow.dir.y * (progress / arrow.maxProgress * 10),
    arrow.dir.z * (progress / arrow.maxProgress * 10)
  );
  positions[3] = arrow.origin.x + dirScaled.x;
  positions[4] = arrow.origin.y + dirScaled.y;
  positions[5] = arrow.origin.z + dirScaled.z;

  pointsRef.current.geometry.attributes.position.needsUpdate = true;

  return (
    <points ref={pointsRef} material={pointsRef.current.material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
    </points>
  );
};