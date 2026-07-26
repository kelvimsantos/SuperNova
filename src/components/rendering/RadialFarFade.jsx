import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import useGameStore from '../../hooks/useGameStore';

/**
 * RadialFarFade – Substitui o corte retangular do far da câmera
 * por um fade circular suave, sempre ajustado ao tamanho da tela.
 *
 * Como funciona:
 * - Renderiza um quad SEMPRE na frente da câmera (screen-space)
 * - O tamanho do quad é calculado baseado no FOV, aspect ratio e distância,
 *   garantindo que cobre a tela inteira
 * - Aplica um gradiente radial levando em conta o aspect ratio
 *   para manter o círculo perfeito independente da resolução da tela
 * - Centro = transparente, bordas = cor do fog (acompanha clima/dia-noite)
 *
 * Otimizações:
 * - Vetores cacheados para evitar GC
 * - Geometria só recriada se tamanho mudar significativamente
 * - Cor do fog só atualiza quando clima/dia-noite muda
 */
export default function RadialFarFade({
  innerRadius = 0.40,
  softness = 0.30,
  maxOpacity = 0.95,
} = {}) {
  const { camera, size } = useThree();
  const meshRef = useRef(null);
  const currentWeather = useGameStore((s) => s.currentWeather);
  const isNight = useGameStore((s) => s.isNight);

  const lastStateRef = useRef({ weather: '', night: false });
  const colorCacheRef = useRef(new THREE.Color());
  const sizeRef = useRef({ width: 0, height: 0 });

  // Distância do quad em relação à câmera
  const quadDist = 2;

  // Vectores cacheados (evita new dentro do useFrame)
  const dirVec = useRef(new THREE.Vector3());
  const posVec = useRef(new THREE.Vector3());

  const material = useMemo(() => {
    const uniforms = {
      uInnerRadius: { value: innerRadius },
      uSoftness: { value: softness },
      uMaxOpacity: { value: maxOpacity },
      uFogColor: { value: new THREE.Color('#caa165') },
      uAspect: { value: size.width / size.height },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      uniform float uInnerRadius;
      uniform float uSoftness;
      uniform float uMaxOpacity;
      uniform vec3 uFogColor;
      uniform float uAspect;

      void main() {
        // Centraliza e corrige aspect ratio para círculo perfeito
        vec2 center = vUv - vec2(0.5);
        center.x *= uAspect;

        float dist = length(center);
        float maxDist = length(vec2(uAspect * 0.5, 0.5));
        float normalizedDist = dist / maxDist;

        float fadeFactor = smoothstep(uInnerRadius, uInnerRadius + uSoftness, normalizedDist);
        float alpha = fadeFactor * uMaxOpacity;

        gl_FragColor = vec4(uFogColor, alpha);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    });
  }, [innerRadius, softness, maxOpacity]);

  useFrame(() => {
    if (!meshRef.current || !material) return;

    // Segue a câmera INSTANTANEAMENTE — sem lerp, sem delay
    camera.getWorldDirection(dirVec.current);
    posVec.current.copy(camera.position).add(dirVec.current.multiplyScalar(quadDist));
    meshRef.current.position.copy(posVec.current);
    meshRef.current.quaternion.copy(camera.quaternion);

    // Recalcula tamanho do quad para cobrir FULLSCREEN
    // baseado no FOV vertical, aspect ratio e distância
    const vFovRad = (camera.fov * Math.PI) / 180;
    const aspect = size.width / size.height;
    const halfHeight = quadDist * Math.tan(vFovRad / 2);
    const halfWidth = halfHeight * aspect;
    const neededWidth = halfWidth * 2 * 1.05;
    const neededHeight = halfHeight * 2 * 1.05;

    // Só recria geometria se tamanho mudou significativamente
    if (
      Math.abs(sizeRef.current.width - neededWidth) > 0.01 ||
      Math.abs(sizeRef.current.height - neededHeight) > 0.01
    ) {
      sizeRef.current.width = neededWidth;
      sizeRef.current.height = neededHeight;
      if (meshRef.current.geometry) meshRef.current.geometry.dispose();
      meshRef.current.geometry = new THREE.PlaneGeometry(neededWidth, neededHeight);
    }

    // Atualiza aspect ratio (se a janela redimensionar)
    if (Math.abs(material.uniforms.uAspect.value - aspect) > 0.001) {
      material.uniforms.uAspect.value = aspect;
    }

    // Atualiza a cor do fog baseado no clima + dia/noite
    const prev = lastStateRef.current;
    if (prev.weather !== currentWeather || prev.night !== isNight) {
      prev.weather = currentWeather;
      prev.night = isNight;

      let colorHex;
      if (isNight) {
        colorHex = '#0a0a12';
      } else {
        switch (currentWeather) {
          case 'clear':
          case 'windy':
            colorHex = '#caa165';
            break;
          case 'cloudy':
            colorHex = '#7a9bb5';
            break;
          case 'foggy':
            colorHex = '#9ca3af';
            break;
          case 'rainy':
          case 'heavyRain':
            colorHex = '#5a6a7a';
            break;
          case 'snowy':
          case 'blizzard':
            colorHex = '#b0c4d8';
            break;
          default:
            colorHex = '#caa165';
        }
      }

      colorCacheRef.current.set(colorHex);
      material.uniforms.uFogColor.value.copy(colorCacheRef.current);
    }
  });

  return (
    <mesh
      ref={meshRef}
      frustumCulled={false}
      renderOrder={0}
    >
      <primitive object={material} attach="material" />
    </mesh>
  );
}
