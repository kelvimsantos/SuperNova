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
 * - O tamanho do quad é calculado dinamicamente baseado no FOV,
 *   aspect ratio e distância da câmera, garantindo que cobre a tela inteira
 * - Aplica um gradiente radial levando em conta o aspect ratio
 *   para manter o círculo perfeito independente da resolução da tela
 * - Centro = transparente, bordas = cor do fog (acompanha clima/dia-noite)
 * - Assim, objetos distantes somem suavemente num círculo, não num quadrado
 *
 * Dica: Aumente o `far` da câmera no App.jsx (ex: far={80}) para que
 *       o frustum não corte objetos antes do fade aparecer.
 *
 * Uso: colocar DENTRO do <Canvas>, após os outros elementos de cena.
 */
export default function RadialFarFade({
  innerRadius = 0.40,   // onde começa o fade (0=centro, ~1=borda)
  softness = 0.30,       // suavidade da transição
  maxOpacity = 0.95,     // opacidade máxima nas bordas
} = {}) {
  const { camera, size } = useThree();
  const meshRef = useRef(null);
  const currentWeather = useGameStore((s) => s.currentWeather);
  const isNight = useGameStore((s) => s.isNight);

  // Guarda último estado para evitar recriar objetos desnecessariamente
  const lastStateRef = useRef({ weather: '', night: false });
  const colorCacheRef = useRef(new THREE.Color());
  const sizeRef = useRef({ width: 0, height: 0 });

  // Distância do quad em relação à câmera
  const quadDist = 2;

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
        center.x *= uAspect; // corrige para manter círculo mesmo em wide screen

        float dist = length(center);
        // Normaliza: distância máxima num retângulo corrigido por aspect
        float maxDist = length(vec2(uAspect * 0.5, 0.5));
        float normalizedDist = dist / maxDist;

        // Fade: começa após innerRadius, transiciona suavemente até a borda
        float fadeFactor = smoothstep(uInnerRadius, uInnerRadius + uSoftness, normalizedDist);

        // Limita à opacidade máxima
        float alpha = fadeFactor * uMaxOpacity;

        // Output: cor do fog com alpha (blending normal)
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

    // Mantém o quad sempre na frente da câmera
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pos = new THREE.Vector3()
      .copy(camera.position)
      .add(dir.multiplyScalar(quadDist));
    meshRef.current.position.copy(pos);
    meshRef.current.quaternion.copy(camera.quaternion);

    // Recalcula tamanho do quad para cobrir FULLSCREEN
    // baseado no FOV vertical, aspect ratio e distância
    const vFovRad = (camera.fov * Math.PI) / 180;
    const aspect = size.width / size.height;
    const halfHeight = quadDist * Math.tan(vFovRad / 2);
    const halfWidth = halfHeight * aspect;
    const neededWidth = halfWidth * 2 * 1.05; // 5% extra para cobrir bordas
    const neededHeight = halfHeight * 2 * 1.05;

    if (
      Math.abs(sizeRef.current.width - neededWidth) > 0.01 ||
      Math.abs(sizeRef.current.height - neededHeight) > 0.01
    ) {
      sizeRef.current.width = neededWidth;
      sizeRef.current.height = neededHeight;
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = new THREE.PlaneGeometry(neededWidth, neededHeight);
    }

    // Atualiza aspect ratio dinamicamente (se a janela redimensionar)
    if (material.uniforms.uAspect.value !== aspect) {
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

      const targetColor = colorCacheRef.current.set(colorHex);
      material.uniforms.uFogColor.value.copy(targetColor);
    }
  });

  return (
    <mesh
      ref={meshRef}
      frustumCulled={false}
      renderOrder={100001}
    >
      <primitive object={material} attach="material" />
    </mesh>
  );
}
