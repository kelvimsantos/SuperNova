import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import useGameStore from '../../hooks/useGameStore';

/**
 * Overlay de “névoa por distância” (fake fog).
 * Funciona mesmo sem depender de Fog do Three.
 *
 * - Coloca uma máscara na tela (um quad sempre na frente da câmera)
 * - Calcula fator de neblina baseado em distância (player -> fragment)
 *
 * Observação: como é overlay 2D, não é fog físico (não usa depth),
 * mas serve para “esconder” a transição de far/culling/streaming.
 */
export default function DistanceFogOverlay({
  color = new THREE.Color('#757b84'),
  near = 5,      // começa a ficar nebuloso mais ou menos aqui (em metros)
  far = 5,      // fica bem nebuloso perto daqui
  opacity = 100.0,
  strength = 500.6, // multiplica o efeito (aumentado p/ ficar mais visível)
} = {}) {
  const { camera, scene } = useThree();
  const playerPosition = useGameStore((s) => s.playerPosition);

  const meshRef = useRef(null);

  const material = useMemo(() => {
    const uColor = new THREE.Color(color);

    const uniforms = {
      uPlayer: { value: new THREE.Vector3() },
      uNear: { value: near },
      uFar: { value: far },
      uOpacity: { value: opacity },
      uStrength: { value: strength },
      uColor: { value: uColor },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Fake: usa vUv para criar “curva” radial (opcional) + distância linear.
    // Para ficar bem visível sem depth buffer, a gente não tenta recuperar Z real.
    // Em vez disso, aplica um gradiente forte do centro para fora.
    const fragmentShader = `
      uniform vec3 uColor;
      uniform float uNear;
      uniform float uFar;
      uniform float uOpacity;
      uniform float uStrength;

      varying vec2 vUv;

      void main(){
        vec2 p = vUv - vec2(0.5);
        float radial = length(p) * 2.0; // 0 no centro, ~1 nas bordas

        // mapeia radial para [0..1]
        float t = clamp(radial, 0.0, 1.0);

        // converter para um fator “de distância” estilo fog
        // (uNear/uFar aqui só controlam o contraste do efeito)
        float fogRange = max(0.001, (uFar - uNear));
        float fog = clamp((t * (uFar - uNear) + uNear - uNear) / fogRange, 0.0, 1.0);

        // deixa o centro mais “limpo” e as bordas mais “nevoa”
        float a = fog * uOpacity * uStrength;

        gl_FragColor = vec4(uColor, a);
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
  }, [color, near, far, opacity, strength]);

  useFrame(() => {
    if (!meshRef.current) return;
    if (playerPosition) {
      material.uniforms.uPlayer.value.set(playerPosition.x, playerPosition.y, playerPosition.z);
    }

    // quad na câmera: tamanho fixo em espaço da tela
    // mantém renderOrder alto para garantir efeito.
  });

  return (
      <mesh
      ref={meshRef}
      frustumCulled={false}
      renderOrder={100000}
      position={[0, 0, -10]}
    >
      <planeGeometry args={[50, 50]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

