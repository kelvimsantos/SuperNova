import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';

/**
 * Overlay de “escuro fora do raio” usando ShaderMaterial em um plane.
 * O escuro é em screen-space (UV), então o resultado é sempre circular na visão.
 */
export const RadialDarkMaskController = ({
  radius = 0.55, // em UV (aprox)
  softness = 0.10,
  opacity = 0.85,
  inner = 0.80,
  enabled = true,
}) => {
  const { camera } = useThree();
  const playerPosition = useGameStore((s) => s.playerPosition);
  const meshRef = useRef(null);
  const materialRef = useRef(null);

  const vertexShader = `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    uniform float uRadius;
    uniform float uSoftness;
    uniform float uOpacity;
    uniform float uInner;

    void main(){
      vec2 p = vUv - vec2(0.5);
      float d = length(p) * 2.0;

      // Dentro do raio => mask~1
      float edge = uInner * uRadius * 2.0;
      float fade = uSoftness * uRadius * 2.0;
      float mask = smoothstep(edge, edge - fade, d);

      float dark = (1.0 - mask) * uOpacity;
      gl_FragColor = vec4(0.0, 0.0, 0.0, dark);
    }
  `;

  useFrame(() => {
    if (!enabled) return;
    if (!meshRef.current) return;

    // plane sempre na frente da câmera
    const dist = 4;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pos = new THREE.Vector3().copy(camera.position).add(dir.multiplyScalar(dist));

    meshRef.current.position.copy(pos);
    meshRef.current.quaternion.copy(camera.quaternion);
  });

  if (!enabled) return null;

  return (
    <mesh
      ref={meshRef}
      frustumCulled={false}
      renderOrder={100000}
      position={[0, 0, -10]}
    >
      <planeGeometry args={[2.2, 2.2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
        uniforms={{
          uRadius: { value: radius },
          uSoftness: { value: softness },
          uOpacity: { value: opacity },
          uInner: { value: inner },
        }}
      />
    </mesh>
  );
};

