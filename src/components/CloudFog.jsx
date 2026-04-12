import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Partículas de nuvem GRANDES e visíveis
const cloudShader = {
  vertex: `
    attribute float size;
    attribute vec3 colorVariation;
    varying vec3 vColor;
    uniform float time;
    
    void main() {
      vColor = colorVariation;
      vec3 pos = position;
      
      // Movimento flutuante das nuvens
      pos.x += sin(time * 0.4 + position.z) * 0.08;
      pos.z += cos(time * 0.35 + position.x) * 0.08;
      pos.y += sin(time * 0.6 + position.x) * 0.03;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (280.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragment: `
    varying vec3 vColor;
    uniform float time;
    
    void main() {
      vec2 coord = gl_PointCoord;
      float dist = length(coord - 0.5);
      
      // Forma de nuvem suave
      float alpha = (1.0 - dist * 1.0) * 0.85;
      alpha = clamp(alpha, 0.0, 0.9);
      
      // Brilho no centro
      float glow = (1.0 - dist) * 0.7;
      vec3 finalColor = vColor + vec3(glow * 0.3);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export const CloudFog = ({ intensity = 1.0, enabled = true }) => {
  const pointsRef = useRef();
  const timeRef = useRef(0);
  
  const count = 800; // MAIS NUVENS
  
  const { positions, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Posições cobrindo toda a área
      positions[i*3] = (Math.random() - 0.5) * 55;
      positions[i*3+1] = 1.2 + Math.random() * 6.5; // Altura variada
      positions[i*3+2] = (Math.random() - 0.5) * 55;
      
      // Tamanhos grandes e variados
      sizes[i] = 0.9 + Math.random() * 1.8;
      
      // Cores de neblina (branco acinzentado)
      const brightness = 0.8 + Math.random() * 0.2;
      colors[i*3] = brightness * 0.92;
      colors[i*3+1] = brightness * 0.94;
      colors[i*3+2] = brightness;
    }
    
    return { positions, sizes, colors };
  }, []);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: cloudShader.vertex,
      fragmentShader: cloudShader.fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
       depthTest: false,
    });
  }, []);
  
  useFrame(() => {
    if (!pointsRef.current || !enabled) return;
    timeRef.current += 0.016;
    material.uniforms.time.value = timeRef.current;
  });
  
  if (!enabled) return null;
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-colorVariation" args={[colors, 3]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
};