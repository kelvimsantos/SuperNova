import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import useGameStore from '../../hooks/useGameStore';

/**
 * Máscara de escuro fora do raio (vignette circular)
 * - Faz o circle ficar “iluminado” (alpha 0 fora do raio com fade)
 * - Implementa via ShaderMaterial num quad/plane sempre na frente da câmera.
 */
export const RadialDarkMask = ({ radius = 18, inner = 0.85, softness = 0.12, opacity = 0.85 }) => {
  const { camera } = useThree();
  const playerPosition = useGameStore((s) => s.playerPosition);

  const material = useMemo(() => {
    const uniforms = {
      uPlayer: { value: new THREE.Vector3(0, 0, 0) },
      uRadius: { value: radius },
      uInner: { value: inner },
      uSoftness: { value: softness },
      uOpacity: { value: opacity },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Nota: Para simplificar e evitar dependência de depth buffer,
    // a máscara é calculada no espaço da tela a partir de vUv.
    // Isso cria o efeito visual circular “escuro fora do raio” no view.
    const fragmentShader = `
      varying vec2 vUv;
      uniform vec3 uPlayer;
      uniform float uRadius;
      uniform float uInner;
      uniform float uSoftness;
      uniform float uOpacity;

      void main(){
        // centro em (0.5,0.5)
        vec2 p = vUv - vec2(0.5);
        float d = length(p) * 2.0; // normaliza para ~[0..1]

        float edge = uInner;
        float fade = uSoftness;

        // 1 dentro do raio, 0 fora (com transição)
        float mask = smoothstep(edge, edge - fade, d);

        // escurecer: fora do raio => 1 escuro, dentro => 0
        float dark = (1.0 - mask) * uOpacity;

        vec3 base = vec3(0.0);
        gl_FragColor = vec4(base, dark);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
  }, [radius, inner, softness, opacity]);

  useFrame(() => {
    if (!material?.uniforms) return;
    if (playerPosition) material.uniforms.uPlayer.value.set(playerPosition.x, playerPosition.y, playerPosition.z);

    // Mantém o plano sempre em frente à câmera
    // (a mesh/plane será reposicionada na render via refs — aqui deixamos apenas material)
  });

  // Plane “na tela”.
  // Usamos um size grande para cobrir a tela em perspectiva.
  // O reposicionamento/scale em relação à câmera é feito no componente pai.
  return (
    <mesh
      frustumCulled={false}
      renderOrder={10000}
      position={[0, 0, -10]}
    >
      <planeGeometry args={[50, 50]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default RadialDarkMask;

