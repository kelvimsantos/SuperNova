import { useFrame, useThree } from '@react-three/fiber'
import { useFBO, useTexture } from '@react-three/drei'
import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'

const MAX_RIPPLES = 4 // 🔥 menos = mais leve

export const WaterSurfacePRO = forwardRef(function WaterSurfacePRO({
  size = 55,
  waterLevel = 0,

  waveIntensity = 2.0,
  waveSpeed = 0.8,

  opacity = 0.35,
  refractionStrength = 0.06,
  reflectionStrength = 0.35,
  fresnelStrength = 2.0,

  shallowColor = '#5cb8d4',
  deepColor = '#00b2e9'
}, ref) {

  const meshRef = useRef()
  const { gl, scene, camera } = useThree()

  const target = useFBO(128, 128)

  const normalMap = useTexture('/textures/waternormals.jpg')
  const skyTexture = useTexture('/textures/ypos.jpg')

  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping

  useImperativeHandle(ref, () => ({ size, waterLevel }))

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(size, size, 64, 64)
  }, [size])

  const ripples = useRef([])

  const uniforms = useMemo(() => ({
    uTexture: { value: null },
    uTime: { value: 0 },

    uNormalMap: { value: normalMap },
    uSky: { value: skyTexture },

    uOpacity: { value: opacity },
    uRefraction: { value: refractionStrength },
    uReflection: { value: reflectionStrength },
    uFresnel: { value: fresnelStrength },

    uWaveIntensity: { value: waveIntensity },

    uShallow: { value: new THREE.Color(shallowColor) },
    uDeep: { value: new THREE.Color(deepColor) },

    // ✅ CORRETO
    uRippleCenters: {
      value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector2())
    },
    uRippleTimes: { value: new Float32Array(MAX_RIPPLES) }

  }), [normalMap, skyTexture, opacity, refractionStrength, reflectionStrength, fresnelStrength, waveIntensity, shallowColor, deepColor])

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.DoubleSide,

    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;

      uniform float uTime;
      uniform float uWaveIntensity;

      uniform vec2 uRippleCenters[${MAX_RIPPLES}];
      uniform float uRippleTimes[${MAX_RIPPLES}];

      void main() {
        vUv = uv;

        vec3 pos = position;
        float time = uTime;

        float waveLarge =
            sin(pos.x * 0.15 + time) +
            cos(pos.y * 0.15 + time * 0.9);

        float waveMedium =
            sin(pos.x * 0.4 + time * 1.5) +
            cos(pos.y * 0.35 + time * 1.3);

        float height =
            waveLarge * 0.6 +
            waveMedium * 0.4;

        height *= 0.25 * uWaveIntensity;

        pos.z += height;

        // 🔥 RIPPLES EM ANEL (curtos)
        for(int i = 0; i < ${MAX_RIPPLES}; i++) {

          float t = uRippleTimes[i];

          if(t < 1.2) {

            float dist = distance(vUv, uRippleCenters[i]);

            float radius = t * 0.15; // 🔥 alcance menor
            float width = 0.015;     // 🔥 espessura do anel

            float ring =
              smoothstep(radius, radius + width, dist) -
              smoothstep(radius + width, radius + width * 2.0, dist);

            float fade = 1.0 - t;

            pos.z += ring * fade * 0.25;
          }
        }

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,

    fragmentShader: `
      uniform sampler2D uTexture;
      uniform sampler2D uNormalMap;
      uniform sampler2D uSky;

      uniform float uTime;
      uniform float uOpacity;
      uniform float uRefraction;
      uniform float uReflection;
      uniform float uFresnel;

      uniform vec3 uShallow;
      uniform vec3 uDeep;

      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {

        vec2 uv1 = vUv * 4.0 + vec2(uTime * 0.05, uTime * 0.08);
        vec2 uv2 = vUv * 8.0 - vec2(uTime * 0.03, uTime * 0.04);

        vec3 n1 = texture2D(uNormalMap, uv1).rgb;
        vec3 n2 = texture2D(uNormalMap, uv2).rgb;

        vec3 normal = normalize((n1 + n2 - 1.0));

        vec2 refractUV = vUv + normal.xy * uRefraction;
        vec3 refracted = texture2D(uTexture, refractUV).rgb;

        float depth = clamp(vWorldPos.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 waterColor = mix(uDeep, uShallow, depth);

        vec2 skyUV = vec2(
          0.5 + normal.x * 0.3,
          0.5 + normal.y * 0.3
        );

        vec3 sky = texture2D(uSky, skyUV).rgb;

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - dot(viewDir, normal), uFresnel);

        vec3 finalColor = mix(refracted, waterColor, 0.5);
        finalColor = mix(finalColor, sky, fresnel * uReflection);

        gl_FragColor = vec4(finalColor, uOpacity);
      }
    `
  }), [uniforms])

  useFrame((state, delta) => {
    if (!meshRef.current) return

    const dist = camera.position.distanceTo(meshRef.current.position)

    material.uniforms.uTime.value = state.clock.elapsedTime

    // ripple update
    ripples.current.forEach(r => r.time += delta)
    ripples.current = ripples.current.filter(r => r.time < 1.2)

    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (ripples.current[i]) {
        material.uniforms.uRippleCenters.value[i] = ripples.current[i].pos
        material.uniforms.uRippleTimes.value[i] = ripples.current[i].time
      } else {
        material.uniforms.uRippleTimes.value[i] = 999
      }
    }

    if (dist < 12) {
      meshRef.current.visible = false

      gl.setRenderTarget(target)
      gl.render(scene, camera)
      gl.setRenderTarget(null)

      meshRef.current.visible = true

      material.uniforms.uTexture.value = target.texture
    }
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[0, waterLevel, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(e) => {
        if (!e.uv) return

        ripples.current.push({
          pos: new THREE.Vector2(e.uv.x, e.uv.y),
          time: 0
        })

        if (ripples.current.length > MAX_RIPPLES) {
          ripples.current.shift()
        }
      }}
    />
  )
})