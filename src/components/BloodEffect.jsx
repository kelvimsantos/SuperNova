// src/components/BloodEffect.jsx
// 🔥 Efeito de partículas de sangue ao acertar um inimigo
// - Escuta o evento 'combatBlood' e spawna uma explosão de partículas vermelhas
// - As partículas sobem com gravidade e desaparecem em ~0.8s
import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 40;
const LIFETIME = 0.8;

export const BloodEffect = () => {
  const pointsRef = useRef();
  const [bursts, setBursts] = useState([]);
  const idRef = useRef(0);

  // 🔥 Gera um burst de partículas numa posição
  const spawnBurst = useCallback((position) => {
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);
    const siz = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1.5 + Math.random() * 3.5;

      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * 0.05;
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * 0.05;
      pos[i * 3 + 2] = Math.cos(phi) * 0.05;

      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.abs(Math.sin(phi) * Math.sin(theta)) * speed + 1.0; // sobe
      vel[i * 3 + 2] = Math.cos(phi) * speed;

      siz[i] = 0.08 + Math.random() * 0.15;
    }

    const id = ++idRef.current;
    setBursts(prev => [...prev, {
      id,
      position: [position.x, position.y, position.z],
      pos, vel, siz, life: 0,
    }]);
  }, []);

  // 🔥 Listener único do evento de sangue
  useEffect(() => {
    const handler = (e) => {
      const pos = e.detail?.position;
      if (pos) spawnBurst(pos);
    };
    window.addEventListener('combatBlood', handler);
    return () => window.removeEventListener('combatBlood', handler);
  }, [spawnBurst]);

  // 🔥 Anima os bursts
  useFrame((_, delta) => {
    if (!pointsRef.current || bursts.length === 0) return;

    // Remove bursts mortos
    const alive = bursts.filter(b => b.life < LIFETIME);
    if (alive.length !== bursts.length) {
      setBursts(alive);
      return;
    }

    // Atualiza física de cada burst
    const array = pointsRef.current.geometry.attributes.position.array;
    const sizes = pointsRef.current.geometry.attributes.size.array;
    let idx = 0;

    for (const b of alive) {
      const nextLife = b.life + delta;
      b.life = nextLife;
      const fade = Math.max(0.1, 1 - nextLife / LIFETIME);

      for (let i = 0; i < COUNT; i++) {
        b.pos[i * 3] += b.vel[i * 3] * delta;
        b.pos[i * 3 + 1] += b.vel[i * 3 + 1] * delta - 4.0 * delta; // gravidade
        b.pos[i * 3 + 2] += b.vel[i * 3 + 2] * delta;

        array[idx * 3] = b.pos[i * 3] + b.position[0];
        array[idx * 3 + 1] = b.pos[i * 3 + 1] + b.position[1];
        array[idx * 3 + 2] = b.pos[i * 3 + 2] + b.position[2];
        sizes[idx] = b.siz[i] * fade;
        idx++;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.size.needsUpdate = true;
    pointsRef.current.geometry.setDrawRange(0, idx);

    // Opacidade global decai com a vida média
    const avgLife = alive.reduce((s, b) => s + b.life, 0) / alive.length;
    pointsRef.current.material.opacity = Math.max(0, 1 - avgLife / LIFETIME) * 0.9;
  });

  // Material compartilhado
  const material = useRef(new THREE.PointsMaterial({
    color: '#cc1111',
    size: 0.15,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  })).current;

  if (bursts.length === 0) return null;

  const total = bursts.length * COUNT;
  const positions = new Float32Array(total * 3);
  const sizes = new Float32Array(total);

  return (
    <points ref={pointsRef} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
    </points>
  );
};

export default BloodEffect;
