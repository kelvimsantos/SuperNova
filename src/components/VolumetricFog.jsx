import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../hooks/useGameStore';

// Shader para névoa volumétrica com geometria no mundo
const fogVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 0.5);
  }
`;

const fogFragmentShader = `
  uniform float uTime;
  uniform float uDensity;
  uniform vec3 uColor;
  uniform float uHeight;
  uniform float uNoiseScale;
  varying vec2 vUv;
  
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }
  
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  void main() {
    vec2 coord = vUv * uNoiseScale;
    coord.x += uTime * 0.04;
    coord.y += uTime * 0.02;
    
    // Múltiplas camadas para volume
    float n1 = noise(coord);
    float n2 = noise(coord * 2.2 - uTime * 0.03);
    float n3 = noise(coord * 3.8 + uTime * 0.02);
    float n4 = noise(coord * 5.5 - uTime * 0.01);
    
    float cloudPattern = (n1 * 0.4 + n2 * 0.3 + n3 * 0.2 + n4 * 0.1);
    cloudPattern = pow(cloudPattern, 0.9999);
    
    // Altura
    float heightFactor = 30.0 - abs(vUv.y - uHeight) * 1.0;
    heightFactor = clamp(heightFactor, 0.2, 1.0);
    
    float finalDensity = cloudPattern * uDensity * heightFactor;
    finalDensity = clamp(finalDensity, 0.0, 0.96);
    
    vec3 finalColor = uColor;
    finalColor += vec3(0.08, 0.06, 0.9) * n2;
    
    gl_FragColor = vec4(finalColor, finalDensity);
  }
`;

export const VolumetricFog = ({ 
  density = 0.5, 
  color = [0.85, 0.88, 0.92], 
  height = 15.85, 
  noiseScale = 1.5, 
  enabled = true 
}) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const timeRef = useRef(0);
  // 🔥 À noite a névoa volumétrica fica azul-ROXA escura (não lava a madrugada)
  const isNight = useGameStore((s) => s.isNight);
  
  const geometry = useMemo(() => {
    // Plano fixo no mundo — NÃO ACOMPANHA A CÂMERA
    const width = 50;
    const heightPlane = 50;
    const geometry = new THREE.PlaneGeometry(width, heightPlane, 32, 32);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0.8, -8);
   // return geometry;
  }, []);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDensity: { value: density },
        uColor: { value: new THREE.Color(color[0], color[1], color[2]) },
        uHeight: { value: height },
        uNoiseScale: { value: noiseScale },
      },
      vertexShader: fogVertexShader,
      fragmentShader: fogFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });
  }, []);
  
  useFrame(() => {
    if (!enabled) return;
    if (materialRef.current) {
      timeRef.current += 0.016;
      materialRef.current.uniforms.uTime.value = timeRef.current;
      materialRef.current.uniforms.uDensity.value = density;
      if (isNight) {
        materialRef.current.uniforms.uColor.value.setRGB(0.10, 0.03, 0.32);
      } else {
        materialRef.current.uniforms.uColor.value.setRGB(color[0], color[1], color[2]);
      }
    }
  });
  
  if (!enabled) return null;
  
  return (
    <mesh ref={meshRef} geometry={geometry} renderOrder={0}>
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
};