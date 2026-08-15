import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * WaterSurface_Caustics — Água Realista (Cáusticas)
 *
 * Porta o conceito do repositório evanw/webgl-water para Three.js/React:
 *  - Simulação de ondas por textura de altura (ping-pong FBO de baixa resolução)
 *  - Normais derivadas da textura de altura
 *  - Cáusticas animadas projetadas no fundo
 *
 * Mantém as MESMAS props de superfície (size/waterLevel) dos outros modos,
 * para preservar proporção e altura do corpo d'água existente.
 */
export function WaterSurface_Caustics({
  size = 55,
  waterLevel = 0,
  waveIntensity = 2.0,
  waveSpeed = 0.8,
  opacity = 0.6,
  shallowColor = '#5cb8d4',
  deepColor = '#005b8a',
  causticStrength = 0.5,
  causticScale = 2.0,
  causticSpeed = 0.6,
  resolution = 128
}) {
  const meshRef = useRef()
  const causticsRef = useRef()
  const { gl } = useThree()

  // ---------- Simulação de altura (DataTexture ping-pong) ----------
  const sim = useMemo(() => {
    const size = resolution
    const dataA = new Float32Array(size * size * 4)
    const dataB = new Float32Array(size * size * 4)
    const texA = new THREE.DataTexture(dataA, size, size, THREE.RGBAFormat, THREE.FloatType)
    const texB = new THREE.DataTexture(dataB, size, size, THREE.RGBAFormat, THREE.FloatType)
    texA.wrapS = texA.wrapT = THREE.ClampToEdgeWrapping
    texB.wrapS = texB.wrapT = THREE.ClampToEdgeWrapping
    texA.needsUpdate = true
    texB.needsUpdate = true

    // Semeia ondas iniciais aleatórias
    for (let i = 0; i < size * size; i++) {
      dataA[i * 4] = (Math.random() - 0.5) * 0.05 // altura
    }

    return { size, texA, texB, dataA, dataB, current: texA }
  }, [resolution])

  // ---------- Shader da superfície ----------
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uHeight: { value: sim.current },
        uRes: { value: sim.size },
        uSize: { value: size },
        uTime: { value: 0 },
        uWaterLevel: { value: waterLevel },
        uOpacity: { value: opacity },
        uShallow: { value: new THREE.Color(shallowColor) },
        uDeep: { value: new THREE.Color(deepColor) },
        uCausticStrength: { value: causticStrength },
        uCausticScale: { value: causticScale }
      },
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vElevation;

        uniform sampler2D uHeight;
        uniform float uRes;
        uniform float uSize;
        uniform float uWaterLevel;

        void main() {
          vUv = uv;

          // posição local no plano (0..size)
          vec2 local = uv * uSize - uSize * 0.5;

          // coord na textura de altura
          vec2 texCoord = uv;

          // amostra altura da simulação
          float h = texture2D(uHeight, texCoord).r;

          // eleva a superfície
          vec3 pos = vec3(local.x, h * 0.35 + uWaterLevel, local.y);

          // normal aproximada via diferenças finitas
          float eps = 1.0 / uRes;
          float hR = texture2D(uHeight, texCoord + vec2(eps, 0.0)).r;
          float hT = texture2D(uHeight, texCoord + vec2(0.0, eps)).r;
          vec3 n = normalize(vec3(
            (h - hR) * 0.35,
            1.0,
            (h - hT) * 0.35
          ));

          vNormal = normalMatrix * n;
          vElevation = h;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uHeight;
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uShallow;
        uniform vec3 uDeep;
        uniform float uCausticStrength;
        uniform float uCausticScale;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vElevation;

        void main() {
          // direção de visão
          vec3 viewDir = normalize(cameraPosition - vWorldPos);

          // fresnel
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

          // profundidade fake
          float depth = clamp(vElevation * 0.5 + 0.5, 0.0, 1.0);
          vec3 waterColor = mix(uDeep, uShallow, depth);

          // reflexo do céu (aproximado)
          vec3 sky = vec3(0.55, 0.75, 0.95);
          vec3 finalColor = mix(waterColor, sky, fresnel * 0.5);

          // cáusticas dinâmicas na superfície
          float t = uTime * 0.6;
          vec2 p = vUv * uCausticScale;
          float caustic = sin(p.x * 8.0 + t) * cos(p.y * 8.0 + t * 1.3);
          caustic += sin((p.x + p.y) * 12.0 + t * 1.7) * 0.5;
          caustic = max(0.0, caustic);
          caustic *= uCausticStrength;

          finalColor += vec3(0.9, 0.95, 1.0) * caustic * 0.4;

          gl_FragColor = vec4(finalColor, uOpacity + fresnel * 0.2);
        }
      `
    })
  }, [sim, size, waterLevel, opacity, shallowColor, deepColor, causticStrength, causticScale])

  // ---------- Malha de cáusticas no fundo ----------
  const causticsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: causticScale },
        uStrength: { value: causticStrength },
        uColor: { value: new THREE.Color('#aee8ff') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uScale;
        uniform float uStrength;
        uniform vec3 uColor;
        varying vec2 vUv;

        void main() {
          float t = uTime * 0.8;
          vec2 p = vUv * uScale * 6.0;

          // padrão de cáusticas (rede de luz)
          float c = 0.0;
          c += sin(p.x * 3.0 + t) * cos(p.y * 3.0 + t * 1.2);
          c += sin((p.x + p.y) * 5.0 + t * 1.5) * 0.6;
          c += sin(p.x * 7.0 - t * 1.8) * cos(p.y * 7.0 + t) * 0.4;

          c = pow(max(0.0, c), 3.0);
          c *= uStrength;

          gl_FragColor = vec4(uColor, c * 0.8);
        }
      `
    })
  }, [causticScale, causticStrength])

  // ---------- Atualização da simulação (ping-pong FBO) ----------
  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1)

    // ----- Passo de simulação: propagação de ondas -----
    const res = sim.size
    const read = sim.current
    const write = read === sim.texA ? sim.texB : sim.texA
    const rd = read.image.data
    const wr = write.image.data

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const i = y * res + x
        const i4 = i * 4

        // vizinhança (clamp)
        const xm = x > 0 ? x - 1 : 0
        const xp = x < res - 1 ? x + 1 : res - 1
        const ym = y > 0 ? y - 1 : 0
        const yp = y < res - 1 ? y + 1 : res - 1

        const avg =
          (rd[(ym * res + x) * 4] +
           rd[(yp * res + x) * 4] +
           rd[(y * res + xm) * 4] +
           rd[(y * res + xp) * 4]) * 0.25

        // velocidade (g) se move em direção à média, com atenuação
        let vel = rd[i4 + 1] + (avg - rd[i4]) * 2.0 * d * 8.0
        vel *= 0.995

        // altura (r) se move ao longo da velocidade
        let h = rd[i4] + vel * d * 8.0

        // amortece para estabilidade
        h *= 0.999

        wr[i4] = h
        wr[i4 + 1] = vel
        wr[i4 + 2] = rd[i4 + 2]
        wr[i4 + 3] = rd[i4 + 3]
      }
    }

    write.needsUpdate = true
    sim.current = write
    material.uniforms.uHeight.value = write

    material.uniforms.uTime.value = state.clock.elapsedTime
    causticsMaterial.uniforms.uTime.value = state.clock.elapsedTime

    // ----- Adiciona gotas aleatórias (para manter ondas vivas) -----
    if (Math.random() < 0.02) {
      const rx = Math.floor(Math.random() * res)
      const ry = Math.floor(Math.random() * res)
      const idx = (ry * res + rx) * 4
      const rdData = sim.current.image.data
      rdData[idx] += (Math.random() - 0.5) * 0.3
      sim.current.needsUpdate = true
    }
  })

  // ---------- Cleanup ----------
  useEffect(() => {
    return () => {
      sim.texA.dispose()
      sim.texB.dispose()
      material.dispose()
      causticsMaterial.dispose()
    }
  }, [sim, material, causticsMaterial])

  return (
    <group>
      {/* Superfície */}
      <mesh
        ref={meshRef}
        geometry={useMemo(() => new THREE.PlaneGeometry(size, size, 64, 64), [size])}
        material={material}
        position={[0, waterLevel, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* Cáusticas projetadas no fundo */}
      <mesh
        ref={causticsRef}
        geometry={useMemo(() => new THREE.PlaneGeometry(size, size), [size])}
        material={causticsMaterial}
        position={[0, waterLevel - 1.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      />
    </group>
  )
}

export default WaterSurface_Caustics
