import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../hooks/useGameStore';

/**
 * Post-like overlay (sem pós-processamento): um plano em frente à câmera
 * com shader que escurece fora do raio.
 */
export const RadialDarkMaskEffect = ({ radius = 0.32, softness = 0.10, opacity = 0.80, inner = 0.70 }) => {
  const { camera } = useThree();
  const playerPosition = useGameStore((s) => s.playerPosition);
  const matRef = useRef(null);

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
      // distância do centro em espaço UV
      vec2 p = vUv - vec2(0.5);
      float d = length(p) * 2.0; // aproximado

      float edge = uInner * (uRadius * 2.0);
      float fade = uSoftness * (uRadius * 2.0);

      // mask=1 dentro do raio
      float mask = smoothstep(edge, edge - fade, d);
      float dark = (1.0 - mask) * uOpacity;

      gl_FragColor = vec4(0.0,0.0,0.0,dark);
    }
  `;

  const material = useRef(
    new THREE.ShaderMaterial({
      uniforms: {
        uRadius: { value: radius },
        uSoftness: { value: softness },
        uOpacity: { value: opacity },
        uInner: { value: inner },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })
  );

  useFrame(() => {
    if (!camera) return;
    // mantém plano sempre na frente da câmera com size proporcional
    const d = 5;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pos = new THREE.Vector3().copy(camera.position).add(dir.multiplyScalar(d));

    // posiciona e orienta o plano
    const mesh = matRef.current?.parent;
    if (mesh) {
      mesh.position.copy(pos);
      mesh.quaternion.copy(camera.quaternion);
    }

    if (material.current?.uniforms) {
      // playerPosition não é usado aqui (mask está em UV). Mantemos flexível no futuro.
      void playerPosition;
    }
  });

  return (
    <mesh ref={(el) => (matRef.current = el?.material)} frustumCulled={false} renderOrder={100000}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material.current} attach="material" />
    </mesh>
  );
};

