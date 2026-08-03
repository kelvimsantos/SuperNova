import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ========== RAIN VERTEX SHADER (sem timeScale) ==========
const rainVertexShader = `
  attribute float speed;
  attribute vec3 direction;
  attribute float size;
  attribute float trailLength;
  varying float vAlpha;
  varying float vTrail;
  uniform float time;
  uniform float intensity;
  uniform float windStrength;
  uniform float yMin;
  uniform float yMax;

  void main() {
    vec3 pos = position;
    
    float fallSpeed = speed * intensity * 2.2;
    float fallDistance = time * fallSpeed;
    pos.y -= fallDistance;
    
    float windX = sin(time * 2.2 + position.z) * 0.15 * windStrength;
    float windZ = cos(time * 1.8 + position.x) * 0.15 * windStrength;
    pos.x += windX * intensity;
    pos.z += windZ * intensity;
    
    if (pos.y < yMin) {
      pos.y = yMax;
      pos.x = (fract(sin(position.x * 13.589) * 43758.5453) - 0.5) * 55.0;
      pos.z = (fract(cos(position.z * 23.456) * 43758.5453) - 0.5) * 55.0;
    }
    
    vAlpha = 0.85 * intensity;
    vTrail = trailLength;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float pointSize = size * (450.0 / -mvPosition.z) * intensity;
    
    gl_PointSize = pointSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const rainFragmentShader = `
  uniform vec3 color;
  uniform float time;
  varying float vAlpha;
  varying float vTrail;
  
  void main() {
    vec2 coord = gl_PointCoord;
    float y = coord.y;
    float x = coord.x - 0.5;
    float verticalStretch = 5.0;
    float horizontalWidth = 0.3;
    float intensityY = 1.0 - abs(y - 0.5) * 1.0;
    intensityY = clamp(intensityY, 0.4, 1.0);
    float tipFade = 1.0 - abs(y - 0.5) * 0.6;
    float distX = abs(x);
    float shape = 0.0;
    if (distX < horizontalWidth) {
      shape = intensityY * tipFade;
    }
    float centerGlow = (1.0 - distX * 2.0) * 1.0;
    shape += centerGlow * 0.7;
    float alpha = shape * vAlpha;
    alpha = clamp(alpha, 0.0, 0.98);
    vec3 finalColor = color;
    finalColor += vec3(0.55, 0.65, 0.85) * centerGlow;
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// ========== SNOW VERTEX SHADER (sem timeScale) ==========
const snowVertexShader = `
  attribute float speed;
  attribute vec3 direction;
  attribute float size;
  varying float vAlpha;
  uniform float time;
  uniform float intensity;
  uniform float windStrength;
  uniform float yMin;
  uniform float yMax;

  void main() {
    vec3 pos = position;
    float fallSpeed = speed * intensity * 0.45;
    pos.y -= time * fallSpeed;
    float windX = sin(time * 1.2 + position.z) * 0.08 * windStrength;
    float windZ = cos(time * 1.0 + position.x) * 0.08 * windStrength;
    pos.x += windX * intensity;
    pos.z += windZ * intensity;
    if (pos.y < yMin) {
      pos.y = yMax;
      pos.x = (fract(sin(position.x * 12.9898) * 43758.5453) - 0.5) * 55.0;
      pos.z = (fract(cos(position.z * 78.233) * 43758.5453) - 0.5) * 55.0;
    }
    vAlpha = (1.0 - (pos.y + 2.0) / 20.0) * 0.85 * intensity;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (350.0 / -mvPosition.z) * intensity;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const snowFragmentShader = `
  uniform vec3 color;
  uniform float time;
  varying float vAlpha;
  
  void main() {
    vec2 coord = gl_PointCoord;
    float dist = length(coord - 0.5);
    float alpha = (1.0 - dist * 1.3) * vAlpha;
    alpha = clamp(alpha, 0.0, 0.9);
    float glow = (1.0 - dist) * 0.7;
    vec3 finalColor = color + vec3(glow * 0.5);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const particleTypes = {
  rain: {
    count: 1800,
    color: [0.55, 0.75, 0.98],
    speed: 0.32,
    size: 0.14,
    trailLength: 1.8,
    windInfluence: 1.5,
    isRain: true,
    yMin: -2.0,
    yMax: 38.0,
  },
  heavyRain: {
    count: 2500,
    color: [0.50, 0.70, 0.95],
    speed: 0.38,
    size: 0.15,
    trailLength: 2.0,
    windInfluence: 1.8,
    isRain: true,
    yMin: -2.0,
    yMax: 38.0,
  },
  snow: {
    count: 1200,
    color: [0.96, 0.98, 1.00],
    speed: 0.08,
    size: 0.35,
    windInfluence: 0.9,
    isRain: false,
    yMin: -2.0,
    yMax: 36.0,
  },
  blizzard: {
    count: 1600,
    color: [0.94, 0.97, 1.00],
    speed: 0.12,
    size: 0.24,
    windInfluence: 1.5,
    isRain: false,
    yMin: -2.0,
    yMax: 30.0,
  },
};

export const ParticleSystem = ({ 
  type = 'rain', 
  intensity = 1.0, 
  windStrength = 0.5,
  enabled = true 
}) => {
  const pointsRef = useRef();
  const timeRef = useRef(0);
  
  const config = particleTypes[type] || particleTypes.rain;
  const count = Math.floor(config.count * Math.min(1.2, intensity));
  const isRain = config.isRain;
  
  const { positions, speeds, directions, sizes, trails } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const directions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const trails = new Float32Array(count);
    
    const rangeXZ = isRain ? 70 : 55;
    const yMin = config.yMin;
    const yMax = config.yMax;
    
    for (let i = 0; i < count; i++) {
      positions[i*3] = (Math.random() - 0.5) * rangeXZ;
      positions[i*3+1] = yMin + Math.random() * (yMax - yMin);
      positions[i*3+2] = (Math.random() - 0.5) * rangeXZ;
      speeds[i] = config.speed + Math.random() * config.speed * 0.5;
      const angle = Math.random() * Math.PI * 2;
      directions[i*3] = Math.cos(angle) * 0.8;
      directions[i*3+1] = 0;
      directions[i*3+2] = Math.sin(angle) * 0.8;
      sizes[i] = config.size * (0.7 + Math.random() * 1.0);
      trails[i] = config.trailLength || 1.0;
    }
    return { positions, speeds, directions, sizes, trails };
  }, [count, config.speed, config.size, config.trailLength, config.yMin, config.yMax, isRain]);
  
  const material = useMemo(() => {
    const uniforms = {
      time: { value: 0 },
      intensity: { value: intensity },
      windStrength: { value: windStrength },
      color: { value: new THREE.Color(config.color[0], config.color[1], config.color[2]) },
      yMin: { value: config.yMin },
      yMax: { value: config.yMax },
    };
    
    if (isRain) {
      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: rainVertexShader,
        fragmentShader: rainFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    } else {
      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: snowVertexShader,
        fragmentShader: snowFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    }
  }, [config.color, isRain, config.yMin, config.yMax]);
  
  useFrame(() => {
    if (!pointsRef.current || !enabled || intensity < 0.1) return;
    
    timeRef.current += 0.016;
    material.uniforms.time.value = timeRef.current;
    material.uniforms.intensity.value = intensity;
    material.uniforms.windStrength.value = windStrength;
  });
  
  if (!enabled || intensity < 0.1) return null;
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-speed" args={[speeds, 1]} />
        <bufferAttribute attach="attributes-direction" args={[directions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        {isRain && <bufferAttribute attach="attributes-trailLength" args={[trails, 1]} />}
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
};