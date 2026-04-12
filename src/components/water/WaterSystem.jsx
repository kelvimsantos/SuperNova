import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ========== IMPORTA SEUS SHADERS ==========
import utilsGLSL from '../shaders/utils.glsl';

// Registra utils
THREE.ShaderChunk['utils'] = utilsGLSL;

// ========== VERTEX SHADER ==========
const waterVertex = `
  uniform mat4 projectionMatrix;
  uniform mat4 modelViewMatrix;
  uniform sampler2D water;
  
  attribute vec3 position;
  attribute vec2 uv;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vec4 info = texture2D(water, uv);
    
    // Posição com ondulação
    float yOffset = info.r * 0.2;
    vec3 newPosition = vec3(position.x, yOffset, position.z);
    
    vPosition = newPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// ========== FRAGMENT SHADER ==========
const waterFragment = `
  precision highp float;
  
  uniform sampler2D water;
  uniform float time;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    // Cores da água
    vec3 color1 = vec3(0.1, 0.4, 0.7);
    vec3 color2 = vec3(0.2, 0.65, 0.95);
    
    vec3 color = mix(color1, color2, vUv.y);
    
    // Ondulações
    vec4 waterInfo = texture2D(water, vUv);
    float wave = waterInfo.r;
    
    // Brilhos
    float sparkle = sin(vUv.x * 30.0 + time) * cos(vUv.y * 30.0 + time * 1.2);
    sparkle = max(0.0, sparkle) * 0.5;
    
    color += vec3(sparkle);
    
    // Espuma
    float foam = sin(vUv.x * 50.0 + time * 10.0) * 0.5 + 0.5;
    foam *= (1.0 - abs(vUv.y - 0.5) * 1.5);
    color += vec3(foam * 0.3);
    
    gl_FragColor = vec4(color, 0.92);
  }
`;

export const WaterSystem = ({ position = [0, -0.5, 0], size = 8 }) => {
  const meshRef = useRef(null);
  const { gl, camera } = useThree();

  // ========== TEXTURA DE ÁGUA ==========
  const waterTex = useMemo(() => {
    const resolution = 512;
    const data = new Float32Array(resolution * resolution * 4);
    
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const idx = (i * resolution + j) * 4;
        const x = i / resolution * Math.PI * 6;
        const y = j / resolution * Math.PI * 6;
        
        const height = Math.sin(x) * Math.cos(y) * 0.4 +
                       Math.sin(x * 2.5) * 0.2 +
                       Math.cos(y * 2.5) * 0.2;
        
        data[idx] = (height + 0.6) * 0.4;
        data[idx + 1] = 0;
        data[idx + 2] = Math.cos(x) * 0.6;
        data[idx + 3] = Math.sin(y) * 0.6;
      }
    }
    
    const tex = new THREE.DataTexture(data, resolution, resolution, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // ========== MATERIAL ==========
  const waterMaterial = useMemo(() => {
    return new THREE.RawShaderMaterial({
      uniforms: {
        water: { value: waterTex },
        time: { value: 0 },
      },
      vertexShader: waterVertex,
      fragmentShader: waterFragment,
      side: THREE.DoubleSide,
      transparent: true,
    });
  }, [waterTex]);

  // Geometria grande
  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size, 512, 512), [size]);

  const timeRef = useRef(0);
  
  useFrame((state, delta) => {
    timeRef.current += delta;
    
    if (waterMaterial) {
      waterMaterial.uniforms.time.value = timeRef.current;
    }
    
    if (meshRef.current && waterMaterial) {
      waterMaterial.side = THREE.BackSide;
      gl.render(meshRef.current, camera);
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={waterMaterial}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    />
  );
};