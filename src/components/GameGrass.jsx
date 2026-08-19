import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../hooks/useGameStore';
import { getWindStrength, getWindSpeed } from '../config/windConfig';

const createBladeGeometry = (width, height, joints) => {
  const geometry = new THREE.PlaneGeometry(width, height, 1, joints);
  geometry.translate(0, height / 2, 0);
  const positions = geometry.attributes.position.array;
  const vertex = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  
  for (let i = 0; i < positions.length; i += 3) {
    vertex.set(positions[i], positions[i + 1], positions[i + 2]);
    const t = vertex.y / height;
    
    quat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.45 * t);
    vertex.applyQuaternion(quat);
    
    const widthScale = 1 - (t * 0.65);
    positions[i] = vertex.x * widthScale;
    positions[i + 1] = vertex.y;
    positions[i + 2] = vertex.z * widthScale;
  }
  geometry.computeVertexNormals();
  return geometry;
};

export const GameGrass = ({ 
  instances, 
  heightmap, 
  terrainSize, 
  terrainResolution, 
grassWidth = 0.05,
  grassHeight = 0.55,
  // 🔥 DENSIDADE: quantas lâminas pular entre cada instância.
  //    STRIDE=1 → usa TODAS as lâminas (dobro da densidade atual)
  //    STRIDE=2 → usa metade (comportamento anterior, mais leve)
  //    STRIDE=3 → usa 1/3 (mais leve ainda)
  //    Como é instanced mesh (1 draw call), o custo extra por lâmina é
  //    só vertex shader (barato) — o fill rate da tela é o limitador real.
  stride = 1
}) => {
  const meshRef = useRef();
  const timeRef = useRef(0);
  
  // 🔥 Lê playerPosition/luz via getState() dentro do useFrame.
  // Assinar o store com selector aqui fazia o componente re-renderizar a CADA frame
  // (porque Player atualiza playerPosition no store todo frame).
  const playerPositionRef = useRef(null);
  const lightDirCache = useRef(new THREE.Vector3(0.5, 0.8, 0.3));
  const lightIntensityCache = useRef(1.0);
  const ambientIntensity = 0.5; // valor fixo, pode ser ajustado
  
  const currentWindStrength = useRef(getWindStrength());
  const currentWindSpeed = useRef(getWindSpeed());

  const bladeGeo = useMemo(
    () => createBladeGeometry(grassWidth, grassHeight, 3),
    [grassWidth, grassHeight]
  );

  const finalInstances = useMemo(() => {
    if (!instances || !heightmap) return null;

    const step = terrainSize / terrainResolution;
    const width = terrainResolution;
    const count = instances.offsets.length / 3;

    // 🔥 DENSIDADE controlada pela prop `stride`:
    //    stride=1 → usa TODAS as lâminas (densidade máxima)
    //    stride=2 → usa metade (mais leve)
    //    stride=3 → usa 1/3
    // 30k+ blades com shader custom por vértice era o MAIOR custo individual de GPU,
    // mas como é instanced mesh (1 draw call), o custo extra é só vertex shader barato.
    const STRIDE = Math.max(1, Math.floor(stride || 1));

    const finalOffsets = [];
    const finalRotations = [];
    const finalScales = [];
    
    for (let i = 0; i < count; i += STRIDE) {
      const ix = i * 3;
      const x = instances.offsets[ix];
      const z = instances.offsets[ix + 2];
      
      const xi = Math.floor((x + terrainSize / 2) / step);
      const zi = Math.floor((z + terrainSize / 2) / step);
      const idx = zi * (width + 1) + xi;
      const y = heightmap[idx] ?? 0;
      
      finalOffsets.push(x, y, z);
      finalRotations.push(instances.rotations[i]);
      finalScales.push(instances.scales[i]);
    }

return {
      offsets: new Float32Array(finalOffsets),
      rotations: new Float32Array(finalRotations),
      scales: new Float32Array(finalScales),
    };
  }, [instances, heightmap, terrainSize, terrainResolution, stride]);

  const instancedGeo = useMemo(() => {
    if (!finalInstances) return null;

    const geo = new THREE.InstancedBufferGeometry();
    geo.index = bladeGeo.index;
    geo.attributes.position = bladeGeo.attributes.position;
    geo.attributes.uv = bladeGeo.attributes.uv;
    geo.attributes.normal = bladeGeo.attributes.normal;

    geo.setAttribute('offset', new THREE.InstancedBufferAttribute(finalInstances.offsets, 3));
    geo.setAttribute('rotation', new THREE.InstancedBufferAttribute(finalInstances.rotations, 1));
    geo.setAttribute('scale', new THREE.InstancedBufferAttribute(finalInstances.scales, 1));

    return geo;
  }, [bladeGeo, finalInstances]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        bladeHeight: { value: grassHeight },
        playerPosition: { value: new THREE.Vector3(0, 0, 0) },
        interactionRadius: { value: 0.8 },
        interactionStrength: { value: 0.7 },
        windSpeed: { value: currentWindSpeed.current },
        windStrength: { value: currentWindStrength.current },
        uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) },
        uLightIntensity: { value: 1.0 },
        uAmbientIntensity: { value: ambientIntensity },
      },
      vertexShader: `
        attribute float rotation;
        attribute float scale;
        attribute vec3 offset;
        varying vec2 vUv;
        varying float vHeight;
        uniform float time;
        uniform float bladeHeight;
        uniform vec3 playerPosition;
        uniform float interactionRadius;
        uniform float interactionStrength;
        uniform float windSpeed;
        uniform float windStrength;

        void main() {
          vUv = uv;
          vHeight = position.y / bladeHeight;
          
          vec3 pos = position;
          pos.y *= scale;

          float c = cos(rotation);
          float s = sin(rotation);
          vec3 rotatedPos;
          rotatedPos.x = pos.x * c - pos.z * s;
          rotatedPos.y = pos.y;
          rotatedPos.z = pos.x * s + pos.z * c;

          float wind = sin(offset.x * 0.8 + time * windSpeed * 1.2) * cos(offset.z * 0.5 + time * windSpeed * 1.0);
          wind += sin(offset.x * 1.5 - time * windSpeed * 1.8) * 0.4;
          wind = wind * windStrength * vHeight;
          
          rotatedPos.x += wind * 0.35;
          rotatedPos.z += wind * 0.25;

          vec3 worldPos = rotatedPos + offset;
          float dx = worldPos.x - playerPosition.x;
          float dz = worldPos.z - playerPosition.z;
          float dist = sqrt(dx*dx + dz*dz);
          
          float bend = 0.0;
          if (dist < interactionRadius) {
            bend = (1.0 - dist / interactionRadius) * interactionStrength;
            bend = pow(bend, 1.5) * vHeight;
          }
          
          if (bend > 0.0 && dist > 0.01) {
            vec3 dirToPlayer = normalize(vec3(dx, 0.0, dz));
            rotatedPos.x += dirToPlayer.x * bend * 0.5;
            rotatedPos.z += dirToPlayer.z * bend * 0.5;
            rotatedPos.y -= bend * 0.3;
          }

          vec3 finalPos = rotatedPos + offset;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vHeight;
        uniform float time;
        uniform vec3 uLightDir;
        uniform float uLightIntensity;
        uniform float uAmbientIntensity;

        void main() {
          vec3 greenBase = vec3(0.12, 0.45, 0.10);
          vec3 yellowTip = vec3(0.82, 0.72, 0.22);
          
          vec3 color = mix(greenBase, yellowTip, vHeight);
          float variation = sin(vUv.x * 12.0 + time * 5.0) * 0.08;
          color += variation;
          color += pow(vHeight, 1.2) * 0.15;
          
          // Iluminação com fator de redução para evitar estouro
          vec3 normal = vec3(0.0, 1.0, 0.0);
          float diff = max(dot(normal, normalize(uLightDir)), 0.0);
          float lightFactor = 0.2;
          vec3 diffuse = diff * uLightIntensity * lightFactor * color;
          vec3 ambient = uAmbientIntensity * color;
          
          vec3 finalColor = clamp(ambient + diffuse, 0.0, 1.0);
          
          float alpha = 0.92 - vHeight * 0.12;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
    });
  }, [grassHeight]);

  useFrame(() => {
    if (!meshRef.current || !material) return;
    
    // 🔥 getState() NÃO causa re-render (ao contrário de assinar com selector)
    const state = useGameStore.getState();
    const playerPosition = state.playerPosition;
    
    // Culling por distância (distância configurável no menu: Curta/Média/Longa)
    if (playerPosition && meshRef.current.parent) {
      const worldPos = meshRef.current.parent.position;
      const dx = worldPos.x - playerPosition.x;
      const dz = worldPos.z - playerPosition.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      const grassDist = state.graphicsSettings?.grassDistance || 'short';
      const renderRadius = grassDist === 'long' ? 120 : grassDist === 'medium' ? 70 : 40;
      const shouldRender = dist < renderRadius;
      meshRef.current.visible = shouldRender;
      if (!shouldRender) return;
    }
    
    const newWindStrength = getWindStrength();
    const newWindSpeed = getWindSpeed();
    
    if (currentWindStrength.current !== newWindStrength) {
      currentWindStrength.current = newWindStrength;
      material.uniforms.windStrength.value = newWindStrength;
    }
    if (currentWindSpeed.current !== newWindSpeed) {
      currentWindSpeed.current = newWindSpeed;
      material.uniforms.windSpeed.value = newWindSpeed;
    }
    
    timeRef.current += 0.016;
    material.uniforms.time.value = timeRef.current;
    
    if (playerPosition) {
      material.uniforms.playerPosition.value.set(
        playerPosition.x,
        playerPosition.y,
        playerPosition.z
      );
    }

    // Atualiza uniformes de luz (vêm do store) — sem re-render
    if (state.lightDir) {
      lightDirCache.current.copy(state.lightDir);
      material.uniforms.uLightDir.value.copy(lightDirCache.current);
    }
    lightIntensityCache.current = state.lightIntensity ?? 1.0;
    material.uniforms.uLightIntensity.value = lightIntensityCache.current;
  });

  useEffect(() => {
    if (!meshRef.current || !instancedGeo) return;
    
    meshRef.current.geometry = instancedGeo;
    meshRef.current.count = finalInstances.offsets.length / 3;
    meshRef.current.receiveShadow = false;
    meshRef.current.castShadow = false;
  }, [instancedGeo, finalInstances]);

  if (!instancedGeo || !finalInstances) return null;

  const offsets = finalInstances.offsets;
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < offsets.length; i += 3) {
    minX = Math.min(minX, offsets[i]);
    maxX = Math.max(maxX, offsets[i]);
    minZ = Math.min(minZ, offsets[i + 2]);
    maxZ = Math.max(maxZ, offsets[i + 2]);
  }
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const centerY = offsets[1] || 0;

return (
    <group position={[centerX, centerY, centerZ]}>
      <group position={[-centerX, -centerY, -centerZ]}>
        <instancedMesh
          ref={meshRef}
          args={[null, material, finalInstances.offsets.length / 3]}
          frustumCulled={false}
          castShadow={false}
          receiveShadow={false}
        />
      </group>
    </group>
  );
};

