import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

let cachedTexture = null;

function createNoiseTexture3D() {
  if (cachedTexture) return cachedTexture;
  
  console.log('🌥️ Gerando textura 3D...');
  const size = 50;
  const data = new Uint8Array(size * size * size);
  
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x / size - 0.5;
        const ny = y / size - 0.5;
        const nz = z / size - 0.5;
        
        const radius = Math.sqrt(nx*nx + ny*ny + nz*nz);
        let density = 0;
        
        if (radius < 0.6) {
          density = 1.0 - radius * 1.2;
          density *= 0.6 + 0.4 * Math.sin(nx * 10) * Math.sin(ny * 10) * Math.sin(nz * 10);
          density = Math.max(0, Math.min(1, density));
        }
        
        data[(z * size * size) + (y * size) + x] = Math.floor(density * 255);
      }
    }
  }
  
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RedFormat;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.wrapR = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  
  cachedTexture = texture;
  console.log('✅ Textura 3D pronta!');
  return texture;
}

const vertexShader = `
  varying vec3 vOrigin;
  varying vec3 vDirection;
  uniform vec3 cameraPos;
  
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPos, 1.0)).xyz;
    vDirection = position - vOrigin;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform sampler3D uVolumeTexture;
  uniform float uDensity;
  uniform float uTime;
  uniform vec3 uTextureOffset;
  uniform float uTextureTiling;
  uniform int uQuality;
  
  varying vec3 vOrigin;
  varying vec3 vDirection;
  
  int MAX_STEPS = 48;
  float STEP_SIZE = 0.12;
  
  vec2 hitBox(vec3 orig, vec3 dir) {
    const vec3 box_min = vec3(-0.5);
    const vec3 box_max = vec3(0.5);
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
  }
  
  float getDensity(vec3 p) {
    vec3 texCoord = (p + 0.5) * uTextureTiling;
    vec3 offsetTexCoord = texCoord + uTextureOffset;
    float density = texture(uVolumeTexture, offsetTexCoord).r;
    return density * uDensity;
  }
  
  void main() {
    // Ajusta qualidade baseado no uniform
    MAX_STEPS = uQuality;
    STEP_SIZE = 0.12 * (64.0 / float(uQuality));
    
    vec3 rayDir = normalize(vDirection);
    vec2 bounds = hitBox(vOrigin, rayDir);
    if (bounds.x >= bounds.y) discard;
    bounds.x = max(bounds.x, 0.0);
    
    vec3 p = vOrigin + bounds.x * rayDir;
    float rayLength = bounds.y - bounds.x;
    float stepSize = rayLength / float(MAX_STEPS);
    
    vec3 accumulatedColor = vec3(0.0);
    float transmittance = 1.0;
    
    for (int i = 0; i < 96; i++) {
      if (i >= MAX_STEPS) break;
      float density = getDensity(p);
      
      if (density > 0.05) {
        vec3 whiteColor = vec3(1.0, 0.98, 0.95);
        float brightness = density * stepSize * 2.5;
        accumulatedColor += whiteColor * brightness * transmittance;
        transmittance *= (1.0 - density * stepSize * 1.5);
      }
      
      p += rayDir * stepSize;
      if (transmittance < 0.05) break;
    }
    
    float alpha = 1.0 - transmittance;
    if (alpha < 0.1) discard;
    
    gl_FragColor = vec4(accumulatedColor, alpha);
  }
`;

export const VolumetricClouds = ({ 
  density = 5.0,
  tiling = 1.5,
  speed = 0.05,
  scale = 14,
  position = [0, 5.2, -1.5],
  enabled = true
}) => {
  const { camera } = useThree();
  const meshRef = useRef();
  const materialRef = useRef();
  const texture = useMemo(() => createNoiseTexture3D(), []);
  const timeRef = useRef(0);
  const offsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const qualityRef = useRef(64);
  
  const material = useMemo(() => {
    console.log('🎨 Criando nuvem branca densa...');
    return new THREE.ShaderMaterial({
      uniforms: {
        uVolumeTexture: { value: texture },
        uDensity: { value: density },
        uTime: { value: 0 },
        uTextureOffset: { value: new THREE.Vector3(0, 0, 0) },
        uTextureTiling: { value: tiling },
        cameraPos: { value: camera.position },
        uQuality: { value: 64 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
       depthTest: false,
    });
  }, [texture, density, tiling]);
  
  useFrame(() => {
    if (!enabled || !materialRef.current) return;
    
    timeRef.current += 0.016;
    offsetRef.current.x += 0.008 * speed;
    offsetRef.current.z += 0.005 * speed;
    
    // ===== LOD POR DISTÂNCIA =====
    const distToCamera = camera.position.distanceTo(meshRef.current.position);
    let quality = 48;
    if (distToCamera < 15) quality = 72;
    else if (distToCamera < 30) quality = 56;
    else if (distToCamera < 50) quality = 40;
    else quality = 32;
    
    if (qualityRef.current !== quality) {
      qualityRef.current = quality;
      materialRef.current.uniforms.uQuality.value = quality;
    }
    
    materialRef.current.uniforms.uTime.value = timeRef.current;
    materialRef.current.uniforms.uTextureOffset.value = offsetRef.current;
    materialRef.current.uniforms.cameraPos.value = camera.position;
    materialRef.current.uniforms.uDensity.value = density;
  });
  
  if (!enabled) return null;
  if (!material) return null;
  
  return (
    <mesh 
      ref={meshRef} 
      position={position}
      scale={[scale, scale * 0.55, scale]}
    >
      <boxGeometry args={[1, 1, 1]} />
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
};